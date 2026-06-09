import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchShowScore } from './supabase';

const CACHE_PREFIX = 'show_scores_v5_';

export const TRAITS = [
  { key: 'romance', label: 'Romance', color: '#E8A0BF' },
  { key: 'drama', label: 'Drama', color: '#FFAB76' },
  { key: 'suspense', label: 'Suspense', color: '#B39DDB' },
  { key: 'comedy', label: 'Comedy', color: '#FFD166' },
];

export const getShowScores = async (show) => {
  const cacheKey = `${CACHE_PREFIX}${show.id || show.name}`;

  // 1. Check local cache first (instant)
  try {
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch {}

  // 2. Fetch from Supabase if not cached
  const supabaseScore = await fetchShowScore(show.id);
  if (supabaseScore) {
    try { await AsyncStorage.setItem(cacheKey, JSON.stringify(supabaseScore)); } catch {}
    return supabaseScore;
  }

  return null;
};
