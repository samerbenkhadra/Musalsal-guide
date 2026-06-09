import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  Image, TouchableOpacity, RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { fetchTrendingToday, fetchMonthlyHighlight, fetchRecentReviews } from '../services/supabase';
import { IMAGE_BASE_URL, fetchShowById } from '../services/tmdb';
import { usePostHog } from 'posthog-react-native';
import { useLanguage } from '../context/LanguageContext';
import Skeleton from '../components/Skeleton';

function ActivitySkeleton() {
  return (
    <View>
      <View style={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 20 }}>
        <Skeleton width={120} height={28} borderRadius={6} style={{ marginBottom: 8 }} />
        <Skeleton width={220} height={13} borderRadius={4} />
      </View>
      <View style={{ paddingHorizontal: 24, marginBottom: 12 }}>
        <Skeleton width={90} height={14} borderRadius={4} />
      </View>
      {[0, 1, 2, 3].map(i => (
        <View key={i} style={{ flexDirection: 'row', paddingHorizontal: 24, paddingVertical: 14, gap: 12, borderBottomWidth: 1, borderBottomColor: '#2A2A2C' }}>
          <Skeleton width={44} height={66} borderRadius={6} />
          <View style={{ flex: 1, justifyContent: 'center', gap: 7 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Skeleton width={90} height={12} borderRadius={4} />
              <Skeleton width={40} height={10} borderRadius={4} />
            </View>
            <Skeleton width={130} height={11} borderRadius={4} />
            <Skeleton width={200} height={10} borderRadius={4} />
            <Skeleton width={150} height={10} borderRadius={4} />
          </View>
        </View>
      ))}
    </View>
  );
}

let activityLastFetch = 0;
export const invalidateActivityCache = () => { activityLastFetch = 0; };

const isArabic = (text) => {
  if (!text) return false;
  const arabic = (text.match(/[؀-ۿ]/g) || []).length;
  return arabic / text.replace(/\s/g, '').length > 0.3;
};

const timeAgo = (timestamp) => {
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};

export default function ActivityScreen({ navigation }) {
  const { language } = useLanguage();
  const posthog = usePostHog();
  const [trending, setTrending] = useState([]);
  const [highlight, setHighlight] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const loadAll = async (force = false) => {
    const now = Date.now();
    if (!force && now - activityLastFetch < 5 * 60 * 1000) {
      setLoading(false);
      return;
    }
    const [t, h, r] = await Promise.all([
      fetchTrendingToday(),
      fetchMonthlyHighlight(),
      fetchRecentReviews(),
    ]);

    if (language === 'ar') {
      const uniqueIds = [...new Set([...t, h, ...r].filter(Boolean).map(i => i.show_id).filter(Boolean))];
      const arNames = {};
      await Promise.all(uniqueIds.map(id =>
        fetchShowById(id, 'ar').then(s => { if (s?.name) arNames[id] = s.name; }).catch(() => {})
      ));
      t.forEach(i => { if (arNames[i.show_id]) i.show_name = arNames[i.show_id]; });
      if (h && arNames[h.show_id]) h.show_name = arNames[h.show_id];
      r.forEach(i => { if (arNames[i.show_id]) i.show_name = arNames[i.show_id]; });
    }

    setTrending(t);
    setHighlight(h);
    setReviews(r);
    activityLastFetch = now;
    setLoading(false);
    setRefreshing(false);
  };

  useFocusEffect(useCallback(() => {
    setLoading(true);
    loadAll();
  }, []));

  const onRefresh = () => {
    setRefreshing(true);
    loadAll(true);
  };

  const navigateToShow = (item, source) => {
    posthog?.capture('activity_show_tapped', { show_id: item.show_id, show_name: item.show_name, source });
    navigation.navigate('EpisodeDetail', {
      show: { id: item.show_id, name: item.show_name, poster_path: item.poster_path },
      accent: '#FFAB76',
    });
  };

  const isEmpty = !loading && trending.length === 0 && !highlight && reviews.length === 0;

  return (
    <SafeAreaView style={styles.safe}>
      {loading ? (
        <ActivitySkeleton />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFAB76" />}
        >
          <View style={styles.header}>
            <Text style={styles.title}>{language === 'ar' ? 'النشاط' : 'Activity'}</Text>
            <Text style={styles.subtitle}>
              {language === 'ar' ? 'تقييمات ومراجعات المجتمع والمسلسلات الرائجة' : 'Community ratings, reviews and trending shows'}
            </Text>
            <Text style={styles.pullHint}>{language === 'ar' ? 'اسحب للتحديث' : 'Pull down to refresh'}</Text>
          </View>

          {isEmpty && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>{language === 'ar' ? 'لا يوجد نشاط بعد' : 'Nothing here yet'}</Text>
              <Text style={styles.emptySubtitle}>
                {language === 'ar' ? 'ابدأ بتقييم المسلسلات لترى النشاط هنا' : 'Start rating shows to see activity here'}
              </Text>
            </View>
          )}

          {trending.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {language === 'ar' ? 'الأكثر نشاطاً' : 'Trending'}
              </Text>
              {trending.filter(item => item.show_name).map(item => (
                <TouchableOpacity key={item.show_id} style={styles.trendingItem} onPress={() => navigateToShow(item, 'trending')}>
                  {item.poster_path ? (
                    <Image source={{ uri: `${IMAGE_BASE_URL}${item.poster_path}` }} style={styles.trendingPoster} />
                  ) : (
                    <View style={[styles.trendingPoster, styles.posterPlaceholder]} />
                  )}
                  <View style={styles.trendingInfo}>
                    <Text style={styles.trendingName} numberOfLines={1}>{item.show_name}</Text>
                    <Text style={styles.trendingStats}>
                      {item.avg_rating != null && `★ ${item.avg_rating}`}
                      {item.avg_rating != null && (item.rating_count > 0 || item.watch_count > 0) && '  ·  '}
                      {item.rating_count > 0 && (language === 'ar' ? `${item.rating_count} تقييم` : `${item.rating_count} rating${item.rating_count !== 1 ? 's' : ''}`)}
                      {item.rating_count > 0 && item.watch_count > 0 && '  ·  '}
                      {item.watch_count > 0 && (language === 'ar' ? `${item.watch_count} يشاهدون` : `${item.watch_count} watching`)}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {highlight && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {language === 'ar' ? 'أبرز هذا الشهر' : "This Month's Highlight"}
              </Text>
              <TouchableOpacity style={styles.highlightCard} onPress={() => navigateToShow(highlight, 'highlight')}>
                {highlight.poster_path ? (
                  <Image source={{ uri: `${IMAGE_BASE_URL}${highlight.poster_path}` }} style={styles.highlightPoster} />
                ) : (
                  <View style={[styles.highlightPoster, styles.posterPlaceholder]} />
                )}
                <View style={styles.highlightInfo}>
                  <Text style={styles.highlightLabel}>
                    {language === 'ar' ? 'الأعلى تقييماً هذا الشهر' : 'Highest rated this month'}
                  </Text>
                  <Text style={styles.highlightName}>{highlight.show_name}</Text>
                  <Text style={styles.highlightRating}>
                    {'★'.repeat(Math.round(highlight.avg))}{'☆'.repeat(5 - Math.round(highlight.avg))}
                    {'  '}{highlight.avg}
                  </Text>
                  <Text style={styles.highlightCount}>
                    {language === 'ar'
                      ? `${highlight.count} من عشاق المسلسلات`
                      : `${highlight.count} Musalsal fan${highlight.count !== 1 ? 's' : ''}`}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {language === 'ar' ? 'آخر المراجعات' : 'Recently Reviewed'}
            </Text>
            {reviews.length === 0 ? (
              <Text style={styles.emptySection}>
                {language === 'ar' ? 'لا مراجعات بعد' : 'No reviews yet — be the first!'}
              </Text>
            ) : (
              reviews.map(r => (
                <TouchableOpacity key={r.id} style={styles.reviewCard} onPress={() => navigateToShow(r, 'review')}>
                  {r.poster_path ? (
                    <Image source={{ uri: `${IMAGE_BASE_URL}${r.poster_path}` }} style={styles.reviewPoster} />
                  ) : (
                    <View style={[styles.reviewPoster, styles.posterPlaceholder]} />
                  )}
                  <View style={styles.reviewContent}>
                    <View style={styles.reviewMeta}>
                      <Text style={styles.reviewAuthor}>{r.display_name || 'Musalsal fan'}</Text>
                      <Text style={styles.reviewTime}>{timeAgo(r.created_at)}</Text>
                    </View>
                    <Text style={styles.reviewShow} numberOfLines={1}>{r.show_name}</Text>
                    <Text
                      style={[styles.reviewText, isArabic(r.review) && { textAlign: 'right', writingDirection: 'rtl' }]}
                      numberOfLines={3}
                    >
                      {r.review}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#1C1C1E' },
  scroll: { paddingBottom: 40 },
  header: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 20 },
  title: { fontSize: 28, fontWeight: '800', color: '#F5E6D0' },
  subtitle: { fontSize: 13, color: '#A08060', marginTop: 4 },
  pullHint: { fontSize: 11, color: '#6B6B70', marginTop: 8 },
  section: { marginBottom: 8, paddingTop: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#F5E6D0', paddingHorizontal: 24, marginBottom: 12 },
  emptyState: { alignItems: 'center', paddingHorizontal: 40, paddingTop: 60 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#F5E6D0', marginBottom: 8 },
  emptySubtitle: { fontSize: 13, color: '#6B6B70', textAlign: 'center' },
  emptySection: { fontSize: 13, color: '#6B6B70', fontStyle: 'italic', paddingHorizontal: 24 },
  posterPlaceholder: { backgroundColor: '#2A2A2C' },
  trendingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 10,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2C',
  },
  trendingPoster: { width: 44, height: 66, borderRadius: 6 },
  trendingInfo: { flex: 1 },
  trendingName: { fontSize: 15, fontWeight: '700', color: '#F5E6D0', marginBottom: 4 },
  trendingStats: { fontSize: 12, color: '#FFAB76' },
  highlightCard: {
    flexDirection: 'row',
    backgroundColor: '#2A2A2C',
    marginHorizontal: 24,
    borderRadius: 16,
    padding: 16,
    gap: 14,
    alignItems: 'center',
  },
  highlightPoster: { width: 64, height: 96, borderRadius: 10 },
  highlightInfo: { flex: 1 },
  highlightLabel: { fontSize: 11, color: '#6B6B70', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
  highlightName: { fontSize: 18, fontWeight: '800', color: '#F5E6D0', marginBottom: 8, lineHeight: 22 },
  highlightRating: { fontSize: 18, color: '#FFD166', marginBottom: 4 },
  highlightCount: { fontSize: 12, color: '#FFAB76' },
  reviewCard: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2C',
  },
  reviewPoster: { width: 44, height: 66, borderRadius: 6 },
  reviewContent: { flex: 1 },
  reviewMeta: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  reviewAuthor: { fontSize: 13, fontWeight: '700', color: '#FFAB76' },
  reviewTime: { fontSize: 11, color: '#6B6B70' },
  reviewShow: { fontSize: 12, color: '#A08060', marginBottom: 4 },
  reviewText: { fontSize: 13, color: '#F5E6D0', lineHeight: 18 },
});
