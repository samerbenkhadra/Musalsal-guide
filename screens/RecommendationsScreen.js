import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Image,
  Modal,
  ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { fetchShows, fetchAllShows, fetchLatestEpisode, IMAGE_BASE_URL } from '../services/tmdb';
import { getWatchedShows, toggleWatched } from '../services/watchlist';
import { getShowScores, TRAITS } from '../services/scoring';
import { useLanguage } from '../context/LanguageContext';
import SkeletonCard from '../components/SkeletonCard';

export default function RecommendationsScreen({ route, navigation }) {
  const { region, accent = '#FFAB76' } = route.params;
  const { language } = useLanguage();
  const regionNamesAr = {
    Egyptian: 'مصري', Turkish: 'تركي', Gulf: 'خليجي',
    Syrian: 'سوري', Lebanese: 'لبناني', 'All Arabic': 'كل العربي',
  };
  const [shows, setShows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState('discovery');
  const [showScores, setShowScores] = useState({});
  const [activeFilter, setActiveFilter] = useState(null);
  const [scoringDone, setScoringDone] = useState(false);
  const [watchedIds, setWatchedIds] = useState(new Set());

  useFocusEffect(useCallback(() => {
    getWatchedShows().then(setWatchedIds);
  }, []));

  const loadShows = async (selectedMode) => {
    setLoading(true);
    let data;
    if (selectedMode === 'all') data = await fetchAllShows(region, null, language);
    else data = await fetchShows(region, null, language);
    const withEpisodes = await Promise.all(
      data.map(async (show) => {
        const latestEpisode = await fetchLatestEpisode(show.id);
        return { ...show, latestEpisode };
      })
    );
    setShows(withEpisodes);
    setLoading(false);
    generateScoresInBackground(withEpisodes);
  };

  const generateScoresInBackground = async (showList) => {
    setScoringDone(false);
    await Promise.all(
      showList.map(async (show) => {
        const scores = await getShowScores(show);
        if (scores) {
          setShowScores((prev) => ({ ...prev, [show.id]: scores }));
        }
      })
    );
    setScoringDone(true);
  };

  useEffect(() => {
    loadShows(mode);
  }, [region, language]);

  const handleModeSwitch = (selectedMode) => {
    if (selectedMode === mode) return;
    setMode(selectedMode);
    loadShows(selectedMode);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={[styles.backText, { color: accent }]}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{language === 'ar' ? regionNamesAr[region] || region : region}</Text>

        <View style={styles.toggle}>
          <TouchableOpacity
            style={[styles.toggleBtn, mode === 'discovery' && { backgroundColor: accent }]}
            onPress={() => handleModeSwitch('discovery')}
          >
            <Text style={[styles.toggleText, mode === 'discovery' && { color: '#1C1C1E' }]}>Discovery</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, mode === 'all' && { backgroundColor: accent }]}
            onPress={() => handleModeSwitch('all')}
          >
            <Text style={[styles.toggleText, mode === 'all' && { color: '#1C1C1E' }]}>View All</Text>
          </TouchableOpacity>
        </View>
        {mode === 'discovery' && (
          <Text style={styles.discoveryHint}>{language === 'ar' ? 'اختيارات جديدة في كل زيارة' : 'A fresh set of picks every time you visit'}</Text>
        )}

        <View style={styles.filterRow}>
          {TRAITS.map((trait) => (
            <TouchableOpacity
              key={trait.key}
              style={[
                styles.filterPill,
                activeFilter === trait.key && { backgroundColor: trait.color },
                !scoringDone && { opacity: 0.4 },
              ]}
              onPress={() => scoringDone && setActiveFilter(activeFilter === trait.key ? null : trait.key)}
            >
              <Text style={[styles.filterPillText, activeFilter === trait.key && { color: '#1C1C1E' }]}>
                {trait.label}
              </Text>
            </TouchableOpacity>
          ))}
          {!scoringDone && <Text style={styles.scoringHint}>{language === 'ar' ? 'جارٍ التحليل...' : 'Scoring...'}</Text>}
        </View>
        {activeFilter && scoringDone && (
          <View style={[styles.activeFilterBadge, { backgroundColor: TRAITS.find(t => t.key === activeFilter)?.color }]}>
            <Text style={styles.activeFilterBadgeText}>
              Filtered: {TRAITS.find(t => t.key === activeFilter)?.label}
            </Text>
          </View>
        )}
      </View>

      {loading ? (
        <View style={styles.list}>
          {[1, 2, 3, 4, 5].map((i) => <SkeletonCard key={i} />)}
        </View>
      ) : shows.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No shows found. Try a different combination.</Text>
        </View>
      ) : (
        <FlatList
          data={activeFilter
            ? shows.filter((s) => (showScores[s.id]?.[activeFilter] || 0) >= 60)
            : shows}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <Text style={styles.watchHint}>
              {language === 'ar' ? 'اضغط ✓ على المسلسلات التي شاهدتها' : "Tap ✓ on shows you've watched"}
            </Text>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('EpisodeDetail', { show: item, accent })}
            >
              <View style={[styles.accentBar, { backgroundColor: accent }]} />
              <View style={styles.posterWrapper}>
                {item.poster_path ? (
                  <Image source={{ uri: `${IMAGE_BASE_URL}${item.poster_path}` }} style={styles.poster} />
                ) : null}
                <TouchableOpacity
                  style={[styles.watchedBtn, watchedIds.has(item.id) && styles.watchedBtnActive]}
                  onPress={async () => setWatchedIds(await toggleWatched(item.id))}
                >
                  <Text style={styles.watchedBtnText}>✓</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.showName} numberOfLines={1}>{item.name}</Text>
                <Text style={[styles.meta, { color: accent }]}>
                  {item.first_air_date ? item.first_air_date.split('-')[0] : ''}
                </Text>
                {item.latestEpisode && !(item.latestEpisode.season_number === 1 && item.latestEpisode.episode_number === 1) ? (
                  <View style={styles.episodeBadge}>
                    <Text style={[styles.episodeBadgeText, { color: accent }]}>
                      Latest: S{item.latestEpisode.season_number} E{item.latestEpisode.episode_number}
                    </Text>
                    <Text style={styles.episodeName} numberOfLines={1}>
                      {item.latestEpisode.name}
                    </Text>
                  </View>
                ) : null}
                <Text style={[styles.readMore, { color: accent }]}>Read more →</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#1C1C1E',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: '#1C1C1E',
    borderBottomWidth: 1,
    borderBottomColor: '#2E2E30',
  },
  backBtn: {
    marginBottom: 8,
  },
  backText: {
    fontSize: 15,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#F5E6D0',
  },
  headerSub: {
    fontSize: 14,
    color: '#A08060',
    marginTop: 2,
  },
  toggle: {
    flexDirection: 'row',
    backgroundColor: '#2A2A2C',
    borderRadius: 10,
    padding: 3,
    marginTop: 14,
    alignSelf: 'flex-start',
  },
  toggleBtn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#A08060',
  },
  discoveryHint: {
    fontSize: 12,
    color: '#6B6B70',
    marginTop: 8,
    fontStyle: 'italic',
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: '#2A2A2C',
    borderWidth: 1,
    borderColor: '#3A3A3C',
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#A08060',
  },
  scoringHint: {
    fontSize: 11,
    color: '#6B6B70',
    alignSelf: 'center',
    fontStyle: 'italic',
  },
  activeFilterBadge: {
    alignSelf: 'flex-start',
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  activeFilterBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    color: '#A08060',
    fontSize: 15,
    textAlign: 'center',
  },
  list: {
    padding: 20,
  },
  card: {
    backgroundColor: '#2A2A2C',
    borderRadius: 16,
    flexDirection: 'row',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 14,
  },
  accentBar: {
    width: 4,
  },
  posterWrapper: {
    position: 'relative',
    width: 70,
    height: 105,
  },
  poster: {
    width: 70,
    height: 105,
  },
  watchedBtn: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: 1,
    borderColor: '#6B6B70',
    alignItems: 'center',
    justifyContent: 'center',
  },
  watchedBtnActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  watchedBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#fff',
  },
  watchHint: {
    fontSize: 12,
    color: '#6B6B70',
    fontStyle: 'italic',
    marginBottom: 12,
  },
  cardContent: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  showName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F5E6D0',
    marginBottom: 2,
  },
  meta: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  description: {
    fontSize: 13,
    color: '#A08060',
    lineHeight: 18,
    marginBottom: 8,
  },
  episodeBadge: {
    backgroundColor: '#1C1C1E',
    borderRadius: 6,
    padding: 6,
    marginBottom: 8,
  },
  episodeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 2,
  },
  episodeName: {
    fontSize: 11,
    color: '#F5E6D0',
  },
  readMore: {
    fontSize: 12,
    fontWeight: '600',
  },
});
