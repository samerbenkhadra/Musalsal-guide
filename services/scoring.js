import AsyncStorage from '@react-native-async-storage/async-storage';
const CLAUDE_API_KEY = process.env.EXPO_PUBLIC_CLAUDE_API_KEY;
import { fetchShowScore, saveShowScore } from './supabase';

const CACHE_PREFIX = 'show_scores_v5_';

export const TRAITS = [
  { key: 'romance', label: 'Romance', color: '#E8A0BF' },
  { key: 'drama', label: 'Drama', color: '#FFAB76' },
  { key: 'suspense', label: 'Suspense', color: '#B39DDB' },
  { key: 'comedy', label: 'Comedy', color: '#FFD166' },
];

export const getShowScores = async (show) => {
  const cacheKey = `${CACHE_PREFIX}${show.id || show.name}`;

  // 1. Check Supabase first (always up to date)
  const supabaseScore = await fetchShowScore(show.id);
  if (supabaseScore) {
    try { await AsyncStorage.setItem(cacheKey, JSON.stringify(supabaseScore)); } catch {}
    return supabaseScore;
  }

  // 2. Fall back to local cache if Supabase has nothing
  try {
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch {}

  // 3. Call Claude as last resort, then save to both caches
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 80,
        system: 'You are a TV show analyst specialising in Middle Eastern and Turkish TV. Use your own knowledge of the show first, and treat the description only as a supplement. Return ONLY a valid JSON object with integer scores from 0 to 100 for these exact keys: romance, drama, suspense, comedy. No explanation, no extra text, just the JSON.',
        messages: [{
          role: 'user',
          content: `Show: ${show.name}\nCountry of origin: ${show.origin_country?.[0] || 'Unknown'}\nFirst aired: ${show.first_air_date || 'Unknown'}\nDescription: ${show.overview || 'No description available.'}`,
        }],
      }),
    });

    const data = await response.json();
    const text = data.content?.[0]?.text || '{}';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const scores = JSON.parse(jsonMatch ? jsonMatch[0] : '{}');
    await AsyncStorage.setItem(cacheKey, JSON.stringify(scores));
    await saveShowScore(show.id, scores);
    return scores;
  } catch (e) {
    console.log('Scoring error for', show.name, e.message);
    return null;
  }
};
