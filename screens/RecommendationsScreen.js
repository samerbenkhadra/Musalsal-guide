import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
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
  TextInput,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_WIDTH = (SCREEN_WIDTH - 24 - 16) / 3;
import { useFocusEffect } from '@react-navigation/native';
import { usePostHog } from 'posthog-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchShows, fetchAllShows, searchShows, IMAGE_BASE_URL } from '../services/tmdb';
import { getSavedShows, toggleSaved, getAllRatings } from '../services/watchlist';
import { getShowScores, TRAITS } from '../services/scoring';
import { fetchBlockedShows, fetchDubbedShowIds, fetchTitleOverrides } from '../services/supabase';
import { useLanguage } from '../context/LanguageContext';
import SkeletonCard from '../components/SkeletonCard';

export default function RecommendationsScreen({ route, navigation }) {
  const { region, accent = '#FFAB76' } = route.params;
  const { language } = useLanguage();
  const posthog = usePostHog();
  const regionNamesAr = {
    Egyptian: 'مصري', Turkish: 'تركي', Gulf: 'خليجي',
    Syrian: 'سوري', Lebanese: 'لبناني', 'All Regions': 'كل المناطق',
  };
  const [shuffled, setShuffled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState('all');
  const [showScores, setShowScores] = useState({});
  const [activeFilter, setActiveFilter] = useState(null);
  const [scoringDone, setScoringDone] = useState(false);
  const [savedIds, setSavedIds] = useState(new Set());
  const [ratings, setRatings] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [dubbedOnly, setDubbedOnly] = useState(false);
  const [dubbedIds, setDubbedIds] = useState(new Set());
  const [titleOverrides, setTitleOverrides] = useState({});

  useFocusEffect(useCallback(() => {
    getSavedShows().then(setSavedIds);
    getAllRatings().then(setRatings);
    if (region === 'Turkish') fetchDubbedShowIds('Turkish').then(setDubbedIds);
  }, []));

  const handleBookmark = (show) => {
    const id = show.id;
    setSavedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
    toggleSaved(id, show);
  };

  const [rawShows, setRawShows] = useState([]);
  const shows = useMemo(() =>
    rawShows.map(s => titleOverrides[s.id] ? { ...s, name: titleOverrides[s.id] } : s),
    [rawShows, titleOverrides]
  );

  const fetchFreshShows = async (selectedMode, blockedIds) => {
    const onShowsAdded = selectedMode === 'all' ? (newShows) => {
      const filtered = newShows.filter(s => !blockedIds.has(s.id));
      if (filtered.length > 0) {
        setRawShows(prev => {
          const existingIds = new Set(prev.map(s => s.id));
          const unique = filtered.filter(s => !existingIds.has(s.id));
          if (unique.length === 0) return prev;
          return [...prev, ...unique].sort((a, b) => (b.first_air_date || '').localeCompare(a.first_air_date || ''));
        });
        generateScoresInBackground(filtered);
      }
    } : null;
    const rawData = await (selectedMode === 'all'
      ? fetchAllShows(region, null, language, 'first_air_date.desc', onShowsAdded)
      : fetchShows(region, null, language));
    const data = rawData.filter(s => !blockedIds.has(s.id));
    setRawShows(data);
    setShuffled(false);
    setLoading(false);
    generateScoresInBackground(data);
    if (selectedMode === 'all') {
      try {
        await AsyncStorage.setItem(`region_shows_v1_${region}_${language}`, JSON.stringify({ shows: data, timestamp: Date.now() }));
      } catch {}
    }
  };

  const loadShows = async (selectedMode) => {
    if (selectedMode === 'all') {
      try {
        const raw = await AsyncStorage.getItem(`region_shows_v1_${region}_${language}`);
        if (raw) {
          const { shows: cached, timestamp } = JSON.parse(raw);
          setRawShows(cached);
          setShuffled(false);
          setLoading(false);
          generateScoresInBackground(cached);
          if (Date.now() - timestamp > 60 * 60 * 1000) {
            fetchBlockedShows().then(blocked => fetchFreshShows(selectedMode, blocked));
          }
          return;
        }
      } catch {}
    }
    setLoading(true);
    const blockedIds = await fetchBlockedShows();
    fetchFreshShows(selectedMode, blockedIds);
  };

  const generateScoresInBackground = async (showList) => {
    setScoringDone(false);
    const batchSize = 5;
    for (let i = 0; i < showList.length; i += batchSize) {
      const batch = showList.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async (show) => {
          const scores = await getShowScores(show);
          if (scores) {
            setShowScores((prev) => ({ ...prev, [show.id]: scores }));
          }
        })
      );
      if (i + batchSize < showList.length) {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    }
    setScoringDone(true);
  };

  useEffect(() => {
    fetchTitleOverrides().then(setTitleOverrides);
  }, []);

  useEffect(() => {
    loadShows('all');
  }, [region, language]);

  const handleModeSwitch = (selectedMode) => {
    if (selectedMode === mode) return;
    setMode(selectedMode);
    setSearchQuery('');
    loadShows(selectedMode);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={[styles.backText, { color: accent }]}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>{language === 'ar' ? regionNamesAr[region] || region : region}</Text>
          <View style={styles.shuffleRow}>
            {shuffled && (
              <TouchableOpacity
                style={styles.resetBtn}
                onPress={() => loadShows('all')}
              >
                <Text style={styles.resetBtnText}>{language === 'ar' ? 'إعادة' : 'Reset'}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.shuffleBtn, shuffled && { backgroundColor: accent }]}
              onPress={() => {
                const arr = [...rawShows];
                for (let i = arr.length - 1; i > 0; i--) {
                  const j = Math.floor(Math.random() * (i + 1));
                  [arr[i], arr[j]] = [arr[j], arr[i]];
                }
                setRawShows(arr);
                setShuffled(true);
              }}
            >
              <Text style={[styles.shuffleBtnText, shuffled && { color: '#1C1C1E' }]}>🔀 {language === 'ar' ? 'خلط' : 'Shuffle'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.discoveryHint}>{shuffled ? (language === 'ar' ? 'ترتيب عشوائي' : 'Shuffled order') : (language === 'ar' ? 'الأحدث أولاً' : 'Most recent shows shown first')}</Text>
        <TextInput
          style={styles.searchBar}
          placeholder={language === 'ar' ? 'ابحث عن مسلسل...' : 'Search shows...'}
          placeholderTextColor="#6B6B70"
          value={searchQuery}
          onChangeText={async (text) => {
            setSearchQuery(text);
            if (text.trim().length > 1) {
              setSearching(true);
              const [results, blockedIds] = await Promise.all([searchShows(text, region, language), fetchBlockedShows()]);
              setSearchResults(results.filter(s => !blockedIds.has(s.id)));
              setSearching(false);
            } else {
              setSearchResults([]);
            }
          }}
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={styles.filterRowContent}>

          {TRAITS.map((trait) => (
            <TouchableOpacity
              key={trait.key}
              style={[
                styles.filterPill,
                activeFilter === trait.key && { backgroundColor: trait.color },
                !scoringDone && { opacity: 0.4 },
              ]}
              onPress={() => { if (!scoringDone) return; const next = activeFilter === trait.key ? null : trait.key; setActiveFilter(next); if (next) posthog?.capture('filter_applied', { filter: next, region }); }}
            >
              <Text style={[styles.filterPillText, activeFilter === trait.key && { color: '#1C1C1E' }]}>
                {trait.label}
              </Text>
            </TouchableOpacity>
          ))}
          {region === 'Turkish' && (
            <TouchableOpacity
              style={[styles.filterPill, dubbedOnly && { backgroundColor: '#C97A63' }]}
              onPress={() => setDubbedOnly(!dubbedOnly)}
            >
              <Text style={[styles.filterPillText, dubbedOnly && { color: '#1C1C1E' }]}>
                🎙 {language === 'ar' ? 'مدبلج' : 'Dubbed'}
              </Text>
            </TouchableOpacity>
          )}
          {!scoringDone
            ? <Text style={styles.scoringHint}>{language === 'ar' ? 'جارٍ التحليل...' : 'Scoring...'}</Text>
            : !activeFilter && !dubbedOnly && <Text style={styles.scoringHint}>{language === 'ar' ? 'اضغط للتصفية' : 'tap to filter'}</Text>
          }
        </ScrollView>
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
          data={(() => {
            let list = searchQuery.trim().length > 1 ? searchResults : activeFilter ? shows.filter((s) => (showScores[s.id]?.[activeFilter] || 0) >= 65) : shows;
            if (dubbedOnly && dubbedIds.size > 0) list = list.filter(s => dubbedIds.has(s.id));
            return list;
          })()}
          keyExtractor={(item) => item.id.toString()}
          numColumns={3}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <Text style={styles.watchHint}>
              {language === 'ar' ? 'اضغط على أيقونة الإشارة في الملصق لحفظه في قائمتك' : 'Tap the bookmark icon on a poster to save it to your watchlist'}
            </Text>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.gridCard}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('EpisodeDetail', { show: item, accent, isDubbed: dubbedIds.has(item.id) })}
            >
              <View style={styles.gridPosterWrapper}>
                {item.poster_path ? (
                  <Image source={{ uri: `${IMAGE_BASE_URL}${item.poster_path}` }} style={styles.gridPoster} />
                ) : (
                  <View style={styles.gridPosterPlaceholder} />
                )}
                <TouchableOpacity
                  style={[styles.watchedBtn, savedIds.has(item.id) && styles.watchedBtnActive]}
                  onPress={() => handleBookmark(item)}
                >
                  <Ionicons name={savedIds.has(item.id) ? 'bookmark' : 'bookmark-outline'} size={10} color="#fff" />
                </TouchableOpacity>
              </View>
              <Text style={styles.gridTitle} numberOfLines={2}>{item.name}</Text>
              <Text style={[styles.gridYear, { color: accent }]}>
                {item.first_air_date ? item.first_air_date.split('-')[0] : ''}
                {ratings[item.id] ? `  ${'★'.repeat(ratings[item.id])}` : ''}
              </Text>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#F5E6D0',
  },
  shuffleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  shuffleBtn: {
    backgroundColor: '#2A2A2C',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#3A3A3C',
  },
  shuffleBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#A08060',
  },
  resetBtn: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#3A3A3C',
  },
  resetBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B6B70',
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
  searchBar: {
    backgroundColor: '#2A2A2C',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#F5E6D0',
    fontSize: 14,
    marginTop: 8,
  },
  discoveryHint: {
    fontSize: 12,
    color: '#6B6B70',
    marginTop: 8,
    fontStyle: 'italic',
  },
  filterRow: {
    marginTop: 12,
  },
  filterRowContent: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 8,
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
    fontSize: 13,
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
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 40,
  },
  columnWrapper: {
    gap: 8,
    marginBottom: 8,
  },
  gridCard: {
    width: CARD_WIDTH,
  },
  gridPosterWrapper: {
    position: 'relative',
    width: CARD_WIDTH,
    height: CARD_WIDTH * 1.5,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#2A2A2C',
  },
  gridPoster: {
    width: CARD_WIDTH,
    height: CARD_WIDTH * 1.5,
  },
  gridPosterPlaceholder: {
    width: CARD_WIDTH,
    height: CARD_WIDTH * 1.5,
    backgroundColor: '#2A2A2C',
  },
  gridTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#F5E6D0',
    marginTop: 4,
    lineHeight: 14,
  },
  gridYear: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  watchedBtn: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  watchedBtnActive: {
    backgroundColor: '#637AC9',
    borderColor: '#637AC9',
  },
  watchHint: {
    fontSize: 12,
    color: '#6B6B70',
    fontStyle: 'italic',
    marginBottom: 12,
  },
  userRating: {
    fontSize: 11,
    color: '#FFD166',
  },
});
