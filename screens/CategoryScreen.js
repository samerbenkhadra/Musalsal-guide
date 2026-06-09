import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList,
  Image, TouchableOpacity, ActivityIndicator, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const CARD_SIZE = (width - 48 - 16) / 3;
import { fetchCategoryShows, fetchTitleOverrides, fetchPlatformShowIds } from '../services/supabase';
import { IMAGE_BASE_URL, fetchShowById } from '../services/tmdb';
import { getSavedShows, toggleSaved } from '../services/watchlist';
import Skeleton from '../components/Skeleton';

function CategorySkeleton() {
  const cardSize = (width - 48 - 16) / 3;
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
      {[0, 1, 2, 3, 4].map(row => (
        <View key={row} style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
          {[0, 1, 2].map(col => (
            <Skeleton key={col} width={cardSize} height={cardSize * 1.5} borderRadius={8} />
          ))}
        </View>
      ))}
    </View>
  );
}

const THEME_TYPES = new Set(['romance', 'drama', 'suspense', 'comedy']);
const BATCH = 20;

export default function CategoryScreen({ route, navigation }) {
  const { title, type, accent, shows: prefetchedShows, platform, subtitle } = route.params;
  const isTheme = THEME_TYPES.has(type);
  const [shows, setShows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [shuffled, setShuffled] = useState(false);
  const [savedIds, setSavedIds] = useState(new Set());

  useEffect(() => { getSavedShows().then(setSavedIds); }, []);

  const handleBookmark = (show) => {
    const id = show.id;
    setSavedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
    toggleSaved(id, show);
  };
  const allIds = useRef([]);
  const titleMap = useRef({});
  const loadedCount = useRef(0);
  const originalShows = useRef([]);

  useEffect(() => {
    if (prefetchedShows) {
      setShows(prefetchedShows);
      setLoading(false);
      return;
    }
    const init = async () => {
      const [ids, tMap] = await Promise.all([
        platform ? fetchPlatformShowIds(platform) : fetchCategoryShows(type),
        fetchTitleOverrides(),
      ]);
      allIds.current = ids;
      titleMap.current = tMap;
      await loadBatch(ids, 0);
    };
    init();
  }, []);

  const loadBatch = async (ids, offset) => {
    if (offset === 0) setLoading(true);
    else setLoadingMore(true);

    const batch = ids.slice(offset, offset + BATCH);
    if (batch.length === 0) { setLoading(false); setLoadingMore(false); return; }

    const results = await Promise.all(batch.map(id => fetchShowById(id).catch(() => null)));
    const valid = results
      .filter(s => s && s.poster_path)
      .map(s => titleMap.current[s.id] ? { ...s, name: titleMap.current[s.id] } : s);

    setShows(prev => {
      const next = offset === 0 ? valid : [...prev, ...valid];
      originalShows.current = next;
      return next;
    });
    loadedCount.current = offset + BATCH;
    setLoading(false);
    setLoadingMore(false);
  };

  const handleShuffle = () => {
    const arr = [...shows];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    setShows(arr);
    setShuffled(true);
  };

  const handleReset = () => {
    setShows(originalShows.current);
    setShuffled(false);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={[styles.backText, { color: accent }]}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.titleRow}>
          <View>
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
          {isTheme && !loading && (
            <View style={styles.shuffleRow}>
              {shuffled && (
                <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
                  <Text style={styles.resetText}>Reset</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={[styles.shuffleBtn, shuffled && { backgroundColor: accent }]} onPress={handleShuffle}>
                <Text style={[styles.shuffleText, shuffled && { color: '#1C1C1E' }]}>🔀 Shuffle</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {loading ? (
        <CategorySkeleton />
      ) : (
        <FlatList
          data={shows}
          keyExtractor={item => item.id.toString()}
          numColumns={3}
          columnWrapperStyle={styles.row}
          key="3col"
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
          onEndReached={() => {
            if (!shuffled && !loadingMore && loadedCount.current < allIds.current.length) {
              loadBatch(allIds.current, loadedCount.current);
            }
          }}
          onEndReachedThreshold={0.4}
          ListFooterComponent={loadingMore ? <ActivityIndicator color={accent} style={{ marginVertical: 16 }} /> : null}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate('EpisodeDetail', { show: item, accent })}
            >
              <View style={styles.posterWrapper}>
                <Image source={{ uri: `${IMAGE_BASE_URL}${item.poster_path}` }} style={styles.poster} />
                <TouchableOpacity
                  style={[styles.bookmarkOverlay, savedIds.has(item.id) && styles.bookmarkOverlayActive]}
                  onPress={() => handleBookmark(item)}
                >
                  <Ionicons name={savedIds.has(item.id) ? 'bookmark' : 'bookmark-outline'} size={12} color="#fff" />
                </TouchableOpacity>
              </View>
              <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#1C1C1E' },
  header: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16 },
  backBtn: { marginBottom: 12 },
  backText: { fontSize: 15, fontWeight: '600' },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 26, fontWeight: '800', color: '#F5E6D0' },
  subtitle: { fontSize: 13, color: '#A08060', marginTop: 4 },
  shuffleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  shuffleBtn: { backgroundColor: '#2A2A2C', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1, borderColor: '#3A3A3C' },
  shuffleText: { fontSize: 13, fontWeight: '700', color: '#A08060' },
  resetBtn: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: '#3A3A3C' },
  resetText: { fontSize: 13, fontWeight: '600', color: '#6B6B70' },
  grid: { paddingHorizontal: 24, paddingBottom: 32 },
  row: { justifyContent: 'flex-start', gap: 8, marginBottom: 16 },
  card: { width: CARD_SIZE },
  posterWrapper: { position: 'relative', width: CARD_SIZE, height: CARD_SIZE * 1.5 },
  poster: { width: CARD_SIZE, height: CARD_SIZE * 1.5, borderRadius: 8 },
  bookmarkOverlay: { position: 'absolute', bottom: 4, right: 4, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  bookmarkOverlayActive: { backgroundColor: '#637AC9' },
  name: { fontSize: 10, color: '#F5E6D0', marginTop: 4, lineHeight: 13 },
});
