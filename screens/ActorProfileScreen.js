import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Image,
  FlatList,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fetchPersonDetails, fetchPersonTVCredits, IMAGE_BASE_URL } from '../services/tmdb';
import { getWatchedShows, getSavedShows, toggleSaved } from '../services/watchlist';
import { fetchBlockedShows } from '../services/supabase';
import { useLanguage } from '../context/LanguageContext';
import Skeleton from '../components/Skeleton';

function ActorProfileSkeleton() {
  const cardSize = '30%';
  return (
    <View style={{ padding: 24 }}>
      <View style={{ flexDirection: 'row', gap: 16, marginBottom: 20 }}>
        <Skeleton width={100} height={140} borderRadius={12} />
        <View style={{ flex: 1, justifyContent: 'center', gap: 8 }}>
          <Skeleton width={150} height={20} borderRadius={6} />
          <Skeleton width={60} height={13} borderRadius={4} />
          <Skeleton width={80} height={13} borderRadius={4} />
          <Skeleton width={90} height={13} borderRadius={4} style={{ marginTop: 6 }} />
        </View>
      </View>
      <Skeleton width="100%" height={13} borderRadius={4} style={{ marginBottom: 6 }} />
      <Skeleton width="100%" height={13} borderRadius={4} style={{ marginBottom: 6 }} />
      <Skeleton width="100%" height={13} borderRadius={4} style={{ marginBottom: 6 }} />
      <Skeleton width="60%" height={13} borderRadius={4} style={{ marginBottom: 28 }} />
      <Skeleton width={80} height={17} borderRadius={4} style={{ marginBottom: 16 }} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {[0,1,2,3,4,5].map(i => (
          <View key={i} style={{ width: '30%' }}>
            <Skeleton width="100%" height={140} borderRadius={10} style={{ marginBottom: 6 }} />
            <Skeleton width="80%" height={11} borderRadius={4} style={{ marginBottom: 3 }} />
            <Skeleton width="40%" height={10} borderRadius={4} />
          </View>
        ))}
      </View>
    </View>
  );
}

export default function ActorProfileScreen({ route, navigation }) {
  const { personId, personName, nameAr } = route.params;
  const { language } = useLanguage();
  const [person, setPerson] = useState(null);
  const [shows, setShows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bioExpanded, setBioExpanded] = useState(false);
  const [watchedIds, setWatchedIds] = useState(new Set());
  const [savedIds, setSavedIds] = useState(new Set());
  const [instagramId, setInstagramId] = useState(null);

  useEffect(() => {
    getWatchedShows().then(setWatchedIds);
    getSavedShows().then(setSavedIds);
  }, []);

  const handleBookmark = (show) => {
    const id = show.id;
    setSavedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
    toggleSaved(id, show);
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [details, credits, extIds, blockedIds] = await Promise.all([
        fetchPersonDetails(personId),
        fetchPersonTVCredits(personId, language),
        fetch(`https://api.themoviedb.org/3/person/${personId}/external_ids?api_key=df249df3a0df066640d620b5d876ef69`).then(r => r.json()),
        fetchBlockedShows(),
      ]);
      setPerson(details);
      setShows(credits.filter(s => !blockedIds.has(s.id) && s.poster_path).sort((a, b) => new Date(b.first_air_date || 0) - new Date(a.first_air_date || 0)));
      if (extIds?.instagram_id) setInstagramId(extIds.instagram_id);
      setLoading(false);
    };
    load();
  }, [personId, language]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← {language === 'ar' ? 'رجوع' : 'Back'}</Text>
        </TouchableOpacity>

        {loading ? (
          <ActorProfileSkeleton />
        ) : (
          <>
            <View style={styles.profileHeader}>
              {person?.profile_path ? (
                <Image
                  source={{ uri: `${IMAGE_BASE_URL}${person.profile_path}` }}
                  style={styles.profilePhoto}
                />
              ) : (
                <View style={styles.profilePhotoPlaceholder} />
              )}
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{language === 'ar' ? (nameAr || person?.name || personName) : (person?.name || personName)}</Text>
                {person?.birthday ? (
                  <Text style={styles.profileMeta}>{person.birthday.split('-')[0]}</Text>
                ) : null}
                {person?.place_of_birth ? (
                  <Text style={styles.profileMeta}>{person.place_of_birth}</Text>
                ) : null}
                <Text style={styles.profileCredits}>{shows.length} {language === 'ar' ? 'مسلسل' : 'shows'}</Text>
                {(() => {
                  const watchedCount = shows.filter(s => watchedIds.has(s.id)).length;
                  return watchedCount > 0 ? (
                    <Text style={[styles.watchedCount, { color: '#4CAF50', fontStyle: 'normal', fontWeight: '600' }]}>
                      {language === 'ar' ? `شاهدت ${watchedCount} من ${shows.length}` : `You've watched ${watchedCount}/${shows.length}`}
                    </Text>
                  ) : (
                    <Text style={styles.watchedCount}>
                      {language === 'ar' ? 'اضغط على أيقونة الإشارة في الملصق لحفظه في قائمتك' : 'Tap the bookmark icon on a poster to save it to your watchlist'}
                    </Text>
                  );
                })()}
              </View>
            </View>

            {person?.biography ? (
              <>
                <Text style={styles.bio} numberOfLines={bioExpanded ? undefined : 4}>{person.biography}</Text>
                <TouchableOpacity onPress={() => setBioExpanded(!bioExpanded)} style={styles.seeMoreBtn}>
                  <Text style={styles.seeMoreText}>{bioExpanded ? (language === 'ar' ? 'عرض أقل ↑' : 'See less ↑') : (language === 'ar' ? 'عرض المزيد ↓' : 'See more ↓')}</Text>
                </TouchableOpacity>
              </>
            ) : (
              <Text style={styles.noBio}>{language === 'ar' ? 'لا توجد سيرة ذاتية متاحة' : 'No biography available.'}</Text>
            )}

            {instagramId ? (
              <TouchableOpacity
                style={styles.instagramBtn}
                onPress={() => Linking.openURL(`https://instagram.com/${instagramId}`)}
              >
                <Text style={styles.instagramBtnText}>📸 Instagram</Text>
              </TouchableOpacity>
            ) : null}

            <Text style={styles.sectionTitle}>
              {language === 'ar' ? 'المسلسلات' : 'Shows'}
            </Text>

            <View style={styles.showsGrid}>
              {shows.map((show) => (
                <TouchableOpacity
                  key={show.id}
                  style={styles.showCard}
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate('EpisodeDetail', { show, accent: '#FFAB76' })}
                >
                  <View style={styles.showPosterWrapper}>
                    <Image source={{ uri: `${IMAGE_BASE_URL}${show.poster_path}` }} style={styles.showPoster} />
                    <TouchableOpacity
                      style={[styles.bookmarkOverlay, savedIds.has(show.id) && styles.bookmarkOverlayActive]}
                      onPress={() => handleBookmark(show)}
                    >
                      <Ionicons
                        name={savedIds.has(show.id) ? 'bookmark' : 'bookmark-outline'}
                        size={12}
                        color="#fff"
                      />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.showName} numberOfLines={2}>{show.name}</Text>
                  {show.first_air_date ? (
                    <Text style={styles.showYear}>{show.first_air_date.split('-')[0]}</Text>
                  ) : null}
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#1C1C1E',
  },
  scroll: {
    padding: 24,
    paddingBottom: 48,
  },
  backBtn: {
    marginBottom: 20,
  },
  backText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFAB76',
  },
  profileHeader: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  profilePhoto: {
    width: 100,
    height: 140,
    borderRadius: 12,
  },
  profilePhotoPlaceholder: {
    width: 100,
    height: 140,
    borderRadius: 12,
    backgroundColor: '#2A2A2C',
  },
  profileInfo: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },
  profileName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#F5E6D0',
    marginBottom: 4,
  },
  profileMeta: {
    fontSize: 13,
    color: '#A08060',
  },
  profileCredits: {
    fontSize: 13,
    color: '#FFAB76',
    fontWeight: '600',
    marginTop: 6,
  },
  bio: {
    fontSize: 16,
    color: '#A08060',
    lineHeight: 24,
    marginBottom: 6,
  },
  seeMoreBtn: {
    marginBottom: 24,
  },
  seeMoreText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFAB76',
  },
  noBio: {
    fontSize: 14,
    color: '#6B6B70',
    fontStyle: 'italic',
    marginBottom: 24,
  },
  instagramBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#2A2A2C',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 20,
  },
  instagramBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F5E6D0',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#F5E6D0',
    marginBottom: 16,
  },
  showsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  showCard: {
    width: '30%',
  },
  showPosterWrapper: {
    position: 'relative',
    width: '100%',
    aspectRatio: 2 / 3,
    marginBottom: 6,
  },
  showPoster: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  bookmarkOverlay: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookmarkOverlayActive: {
    backgroundColor: '#637AC9',
  },
  watchedCount: {
    fontSize: 12,
    color: '#6B6B70',
    fontStyle: 'italic',
    marginTop: 2,
  },
  showName: {
    fontSize: 12,
    color: '#F5E6D0',
    fontWeight: '600',
    lineHeight: 16,
  },
  showYear: {
    fontSize: 11,
    color: '#6B6B70',
    marginTop: 2,
  },
});
