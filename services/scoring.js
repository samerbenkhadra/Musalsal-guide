import AsyncStorage from '@react-native-async-storage/async-storage';
import { CLAUDE_API_KEY } from './config';

const CACHE_PREFIX = 'show_scores_v2_';

export const TRAITS = [
  { key: 'romance', label: 'Romance', color: '#E8A0BF' },
  { key: 'drama', label: 'Drama', color: '#FFAB76' },
  { key: 'suspense', label: 'Suspense', color: '#B39DDB' },
  { key: 'betrayal', label: 'Betrayal', color: '#FF6B6B' },
];

export const getShowScores = async (show) => {
  const cacheKey = `${CACHE_PREFIX}${show.id || show.name}`;

  try {
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch {}

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
        system: 'You are a TV show analyst. Given a show name and description, return ONLY a valid JSON object with integer scores from 0 to 100 for these exact keys: romance, drama, suspense, betrayal. No explanation, no extra text, just the JSON.',
        messages: [{
          role: 'user',
          content: `Show: ${show.name}\nDescription: ${show.overview || 'No description available.'}`,
        }],
      }),
    });

    const data = await response.json();
    const text = data.content?.[0]?.text || '{}';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const scores = JSON.parse(jsonMatch ? jsonMatch[0] : '{}');
    console.log('Scores for', show.name, scores);
    await AsyncStorage.setItem(cacheKey, JSON.stringify(scores));
    return scores;
  } catch (e) {
    console.log('Scoring error for', show.name, e.message);
    return null;
  }
};
