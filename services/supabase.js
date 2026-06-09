import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

const SUPABASE_URL = 'https://nkhhtznlasaqpatyzecp.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_jnkKomxY482IhlpCr-2loA_dgBzXECu';

const secureStoreAdapter = {
  getItem: (key) => SecureStore.getItemAsync(key).catch(() => null),
  setItem: (key, value) => SecureStore.setItemAsync(key, value).catch(() => {}),
  removeItem: (key) => SecureStore.deleteItemAsync(key).catch(() => {}),
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: secureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export const callClaude = async (prompt) => {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/claude-proxy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
      body: JSON.stringify({ prompt }),
    });
    const data = await res.json();
    return data.text || '';
  } catch {
    return '';
  }
};

export const fetchShowScore = async (showId) => {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/show_scores?show_id=eq.${showId}&select=romance,drama,suspense,comedy`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      }
    );
    const data = await res.json();
    return data?.[0] || null;
  } catch {
    return null;
  }
};

export const saveShowScore = async (showId, scores) => {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/show_scores`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=ignore-duplicates',
      },
      body: JSON.stringify({ show_id: showId, ...scores }),
    });
  } catch {}
};

export const fetchActorNameOverrides = async () => {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/actor_names?select=tmdb_id,name_ar`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      }
    );
    const data = await res.json();
    return Object.fromEntries((data || []).map((r) => [r.tmdb_id, r.name_ar]));
  } catch {
    return {};
  }
};

export const fetchLibraryShowIds = async () => {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/library_shows?select=show_id&limit=5000`,
      { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
    );
    const data = await res.json();
    return new Set((data || []).map(r => r.show_id));
  } catch {
    return new Set();
  }
};

export const fetchDubbedShowIds = async (region) => {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/library_shows?region=eq.${encodeURIComponent(region)}&dubbed=eq.true&select=show_id&limit=5000`,
      { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
    );
    const data = await res.json();
    return new Set((data || []).map(r => r.show_id));
  } catch {
    return new Set();
  }
};

export const fetchLibraryShowIdsByRegion = async (region) => {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/library_shows?region=eq.${encodeURIComponent(region)}&select=show_id&limit=5000`,
      { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
    );
    const data = await res.json();
    return (data || []).map(r => r.show_id);
  } catch {
    return [];
  }
};

export const fetchBlockedShows = async () => {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/blocked_shows?select=show_id`,
      { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
    );
    const data = await res.json();
    return new Set((data || []).map(r => r.show_id));
  } catch {
    return new Set();
  }
};

const TMDB_WATCH_REGIONS = ['SA', 'AE', 'EG', 'QA', 'KW'];
const TMDB_PROVIDER_MAP = {
  'shahid': { name: 'Shahid', url: 'https://shahid.mbc.net' },
  'netflix': { name: 'Netflix', url: 'https://www.netflix.com' },
  'osn+': { name: 'OSN+', url: 'https://www.osnplus.com' },
  'starzplay': { name: 'Starz Play', url: 'https://www.starzplay.com' },
  'starz play': { name: 'Starz Play', url: 'https://www.starzplay.com' },
  'weyyak': { name: 'Weyyak', url: 'https://weyyak.com' },
  'watch it': { name: 'Watch iT', url: 'https://watchit.ae' },
  'mbc': { name: 'MBC', url: 'https://www.mbc.net' },
  'apple tv': { name: 'Apple TV', url: 'https://tv.apple.com' },
  'tod': { name: 'TOD', url: 'https://www.tod.tv' },
  'ad tv': { name: 'AD TV', url: 'https://www.adtv.ae' },
  'yango play': { name: 'Yango Play', url: 'https://play.yango.com' },
  'viu': { name: 'Viu', url: 'https://www.viu.com' },
  'youtube': { name: 'YouTube', url: 'https://www.youtube.com' },
  'disney+': { name: 'Disney+', url: 'https://www.disneyplus.com' },
  'disney': { name: 'Disney+', url: 'https://www.disneyplus.com' },
  'amazon prime': { name: 'Amazon Prime', url: 'https://www.primevideo.com' },
  'prime video': { name: 'Amazon Prime', url: 'https://www.primevideo.com' },
  'tabii': { name: 'Tabii', url: 'https://www.tabii.com' },
  'trt': { name: 'Tabii', url: 'https://www.tabii.com' },
};

const resolveTmdbProvider = (name) => {
  const lower = name.toLowerCase().trim();
  for (const [key, val] of Object.entries(TMDB_PROVIDER_MAP)) {
    if (lower.includes(key)) return val;
  }
  return null;
};

const fetchWatchProvidersFromTMDB = async (showId) => {
  try {
    const TMDB_KEY = 'df249df3a0df066640d620b5d876ef69';
    const res = await fetch(`https://api.themoviedb.org/3/tv/${showId}/watch/providers?api_key=${TMDB_KEY}`);
    const data = await res.json();
    if (!data?.results) return null;
    const seen = new Set();
    const platforms = [];
    for (const region of TMDB_WATCH_REGIONS) {
      const regionData = data.results[region];
      if (!regionData) continue;
      for (const p of [...(regionData.flatrate || []), ...(regionData.free || [])]) {
        const resolved = resolveTmdbProvider(p.provider_name);
        if (resolved && !seen.has(resolved.name)) {
          seen.add(resolved.name);
          platforms.push({ platform: resolved.name, url: resolved.url });
        }
      }
    }
    return platforms.length > 0 ? platforms : null;
  } catch {
    return null;
  }
};

export const fetchWhereToWatch = async (showId) => {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/where_to_watch?show_id=eq.${showId}&select=url,platform`,
      { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
    );
    const data = await res.json();
    if (data?.length > 0) return data;
    return await fetchWatchProvidersFromTMDB(showId);
  } catch {
    return null;
  }
};

export const fetchTitleOverrides = async () => {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/title_overrides?select=show_id,title_en&limit=5000`,
      { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
    );
    const data = await res.json();
    return Object.fromEntries((data || []).map(r => [r.show_id, r.title_en]));
  } catch {
    return {};
  }
};

export const searchTitleOverrides = async (query) => {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/title_overrides?title_en=ilike.*${encodeURIComponent(query)}*&select=show_id,title_en&limit=10`,
      { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
    );
    const data = await res.json();
    return data || [];
  } catch {
    return [];
  }
};

export const fetchTitleOverride = async (showId) => {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/title_overrides?show_id=eq.${showId}&select=title_en&limit=1`,
      { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
    );
    const data = await res.json();
    return data?.[0]?.title_en || null;
  } catch {
    return null;
  }
};

export const fetchScoredShowsForChat = async () => {
  try {
    const [overridesRes, scoresRes, libraryRes] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/title_overrides?select=show_id,title_en&limit=5000`, { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }),
      fetch(`${SUPABASE_URL}/rest/v1/show_scores?select=show_id,romance,drama,suspense,comedy&limit=5000`, { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }),
      fetch(`${SUPABASE_URL}/rest/v1/library_shows?select=show_id,region&limit=5000`, { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }),
    ]);
    const [overrides, scores, library] = await Promise.all([overridesRes.json(), scoresRes.json(), libraryRes.json()]);
    const overrideMap = Object.fromEntries((overrides || []).map(r => [r.show_id, r.title_en]));
    const scoreMap = Object.fromEntries((scores || []).map(r => [r.show_id, r]));
    const regionMap = {};
    (library || []).forEach(r => { if (!regionMap[r.show_id]) regionMap[r.show_id] = r.region; });
    return Object.keys(scoreMap)
      .filter(id => regionMap[id] && (scoreMap[id].romance + scoreMap[id].drama + scoreMap[id].suspense + scoreMap[id].comedy) > 0)
      .map(id => ({
        id: Number(id),
        name: overrideMap[id] || '',
        region: regionMap[id],
        romance: scoreMap[id].romance,
        drama: scoreMap[id].drama,
        suspense: scoreMap[id].suspense,
        comedy: scoreMap[id].comedy,
      }));
  } catch { return []; }
};

export const fetchCommunityRating = async (showId) => {
  try {
    const { data } = await supabase
      .from('user_ratings')
      .select('rating')
      .eq('show_id', showId);
    if (!data || data.length === 0) return null;
    const avg = data.reduce((sum, r) => sum + r.rating, 0) / data.length;
    return { average: Math.round(avg * 10) / 10, count: data.length };
  } catch {
    return null;
  }
};

export const fetchComments = async (showId) => {
  try {
    const { data } = await supabase
      .from('show_reviews')
      .select('id, user_id, review, display_name, created_at')
      .eq('show_id', showId)
      .order('created_at', { ascending: false })
      .limit(50);
    return data || [];
  } catch { return []; }
};

export const postComment = async (showId, comment, show = null) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Not logged in' };
    const { data: existing } = await supabase.from('show_reviews').select('id').eq('user_id', user.id).eq('show_id', showId).limit(1);
    if (existing && existing.length > 0) return { error: 'already_reviewed' };
    const { data: profile } = await supabase.from('profiles').select('display_name').eq('user_id', user.id).single();
    const displayName = profile?.display_name || (user.email ? user.email.split('@')[0] : 'user');
    const { error } = await supabase.from('show_reviews').insert({
      user_id: user.id,
      show_id: showId,
      review: comment.trim(),
      display_name: displayName,
      show_name: show?.name || null,
      poster_path: show?.poster_path || null,
    });
    return { error };
  } catch (e) { return { error: e }; }
};

export const fetchTrendingToday = async () => {
  try {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const [{ data: ratings }, { data: watchlist }] = await Promise.all([
      supabase.from('user_ratings').select('show_id, show_name, poster_path, rating').gte('updated_at', since).limit(500),
      supabase.from('user_watchlist').select('show_id, show_name, poster_path, status').eq('status', 'watching').gte('updated_at', since).limit(500),
    ]);
    const map = {};
    (ratings || []).forEach(r => {
      if (!map[r.show_id]) map[r.show_id] = { show_id: r.show_id, show_name: r.show_name, poster_path: r.poster_path, rating_count: 0, watch_count: 0, ratings: [] };
      map[r.show_id].rating_count++;
      map[r.show_id].ratings.push(r.rating);
    });
    (watchlist || []).forEach(r => {
      if (!map[r.show_id]) map[r.show_id] = { show_id: r.show_id, show_name: r.show_name, poster_path: r.poster_path, rating_count: 0, watch_count: 0, ratings: [] };
      map[r.show_id].watch_count++;
    });
    return Object.values(map)
      .map(s => ({ ...s, total: s.rating_count + s.watch_count, avg_rating: s.ratings.length ? Math.round(s.ratings.reduce((a, b) => a + b, 0) / s.ratings.length * 2) / 2 : null }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  } catch { return []; }
};

export const fetchMonthlyHighlight = async () => {
  try {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data } = await supabase.from('user_ratings').select('show_id, show_name, poster_path, rating').gte('updated_at', since);
    if (!data || data.length === 0) return null;
    const map = {};
    data.forEach(r => {
      if (!map[r.show_id]) map[r.show_id] = { show_id: r.show_id, show_name: r.show_name, poster_path: r.poster_path, ratings: [] };
      map[r.show_id].ratings.push(r.rating);
    });
    return Object.values(map)
      .map(s => ({ ...s, avg: Math.round(s.ratings.reduce((a, b) => a + b, 0) / s.ratings.length * 10) / 10, count: s.ratings.length }))
      .sort((a, b) => b.avg - a.avg || b.count - a.count)[0] || null;
  } catch { return null; }
};

export const fetchRecentReviews = async () => {
  try {
    const { data } = await supabase.from('show_reviews')
      .select('id, user_id, review, display_name, show_id, show_name, poster_path, created_at')
      .not('show_name', 'is', null)
      .order('created_at', { ascending: false })
      .limit(10);
    const reviews = data || [];
    const userIds = [...new Set(reviews.map(r => r.user_id).filter(Boolean))];
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, show_in_activity')
        .in('user_id', userIds);
      const profileMap = {};
      (profiles || []).forEach(p => { profileMap[p.user_id] = p; });
      reviews.forEach(r => {
        const profile = profileMap[r.user_id];
        if (profile) {
          r.display_name = profile.show_in_activity ? profile.display_name : null;
        }
        // no profile row → keep stored display_name from show_reviews as fallback
      });
    }
    return reviews;
  } catch { return []; }
};

export const deleteComment = async (commentId) => {
  try {
    const { error } = await supabase.from('show_reviews').delete().eq('id', commentId);
    return { error };
  } catch (e) { return { error: e }; }
};

export const getProfile = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data } = await supabase.from('profiles').select('display_name, show_in_activity').eq('user_id', user.id).single();
    return data || null;
  } catch { return null; }
};

export const updateDisplayName = async (displayName) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const trimmed = displayName.trim();
    await supabase.from('profiles').upsert({ user_id: user.id, display_name: trimmed }, { onConflict: 'user_id' });
  } catch {}
};

export const getActivityPreference = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const { data } = await supabase.from('profiles').select('show_in_activity').eq('user_id', user.id).single();
    return data?.show_in_activity || false;
  } catch { return false; }
};

export const setActivityPreference = async (value) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('profiles').upsert({ user_id: user.id, show_in_activity: value }, { onConflict: 'user_id' });
  } catch {}
};

export const fetchCategoryShows = async (type) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    const recentCutoff = twelveMonthsAgo.toISOString().split('T')[0];
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [result, blocked, library] = await Promise.all([
      (() => {
        if (type === 'recent') return supabase.from('library_shows').select('show_id').gte('first_air_date', recentCutoff).lte('first_air_date', today).not('first_air_date', 'is', null).order('first_air_date', { ascending: false });
        if (type === 'added') return supabase.from('library_shows').select('show_id').gt('added_at', thirtyDaysAgo.toISOString()).order('added_at', { ascending: false });
        if (type === 'old') return supabase.from('library_shows').select('show_id').not('first_air_date', 'is', null).lt('first_air_date', '2000-01-01').order('first_air_date', { ascending: false });
        return supabase.from('show_scores').select('show_id').gte(type, 65).order(type, { ascending: false });
      })(),
      supabase.from('blocked_shows').select('show_id'),
      supabase.from('library_shows').select('show_id').order('first_air_date', { ascending: false, nullsFirst: false }),
    ]);

    const blockedSet = new Set((blocked.data || []).map(r => r.show_id));
    const libraryByDate = [...new Set((library.data || []).map(r => r.show_id))];
    const librarySet = new Set(libraryByDate);
    const ids = [...new Set((result.data || []).map(r => r.show_id))];
    const isScoreType = !['recent', 'added', 'old'].includes(type);
    const filtered = new Set(ids.filter(id => !blockedSet.has(id) && (!isScoreType || librarySet.has(id))));
    if (isScoreType) return libraryByDate.filter(id => filtered.has(id));
    return [...filtered];
  } catch { return []; }
};

export const fetchDiscoverSections = async () => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    const recentCutoff = twelveMonthsAgo.toISOString().split('T')[0];
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [recent, added, old, scores, library, blocked] = await Promise.all([
      supabase.from('library_shows').select('show_id').gte('first_air_date', recentCutoff).lte('first_air_date', today).not('first_air_date', 'is', null).order('first_air_date', { ascending: false }).limit(20),
      supabase.from('library_shows').select('show_id').gt('added_at', thirtyDaysAgo.toISOString()).order('added_at', { ascending: false }).limit(20),
      supabase.from('library_shows').select('show_id').not('first_air_date', 'is', null).lt('first_air_date', '2000-01-01').order('first_air_date', { ascending: false }).limit(20),
      supabase.from('show_scores').select('show_id, romance, drama, suspense, comedy').or('romance.gte.65,drama.gte.65,suspense.gte.65,comedy.gte.65'),
      supabase.from('library_shows').select('show_id').limit(5000),
      supabase.from('blocked_shows').select('show_id'),
    ]);

    const librarySet = new Set((library.data || []).map(r => r.show_id));
    const blockedSet = new Set((blocked.data || []).map(r => r.show_id));
    const notBlocked = (ids) => ids.filter(id => !blockedSet.has(id));

    const scoresData = (scores.data || []).filter(r => librarySet.has(r.show_id) && !blockedSet.has(r.show_id));
    const topByTrait = (trait) => scoresData
      .filter(r => (r[trait] || 0) >= 65)
      .sort((a, b) => b[trait] - a[trait])
      .slice(0, 15)
      .map(r => r.show_id);

    const dedup = (arr) => [...new Set(arr)];
    return {
      recentIds: dedup(notBlocked((recent.data || []).map(r => r.show_id))),
      addedIds: dedup(notBlocked((added.data || []).map(r => r.show_id))),
      oldIds: dedup(notBlocked((old.data || []).map(r => r.show_id))),
      romanceIds: topByTrait('romance'),
      dramaIds: topByTrait('drama'),
      suspenseIds: topByTrait('suspense'),
      comedyIds: topByTrait('comedy'),
    };
  } catch {
    return { recentIds: [], addedIds: [], oldIds: [], romanceIds: [], dramaIds: [], suspenseIds: [], comedyIds: [] };
  }
};

export const fetchDistinctPlatforms = async (limit = 5) => {
  try {
    const { data } = await supabase.from('where_to_watch').select('platform');
    const counts = {};
    (data || []).forEach(r => { counts[r.platform] = (counts[r.platform] || 0) + 1; });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([platform, count]) => ({ platform, count }));
  } catch { return []; }
};

export const fetchPlatformShowIds = async (platform) => {
  try {
    const [watchData, libraryData] = await Promise.all([
      supabase.from('where_to_watch').select('show_id').eq('platform', platform),
      supabase.from('library_shows').select('show_id').order('first_air_date', { ascending: false }),
    ]);
    const platformIds = new Set((watchData.data || []).map(r => r.show_id));
    return (libraryData.data || []).map(r => r.show_id).filter(id => platformIds.has(id));
  } catch { return []; }
};

export const fetchCommunityActivity = async () => {
  try {
    const [{ data: ratings }, { data: watchlist }] = await Promise.all([
      supabase
        .from('user_ratings')
        .select('user_id, show_id, show_name, poster_path, rating, updated_at')
        .order('updated_at', { ascending: false })
        .limit(40),
      supabase
        .from('user_watchlist')
        .select('user_id, show_id, show_name, poster_path, status, updated_at')
        .in('status', ['watched', 'watching'])
        .order('updated_at', { ascending: false })
        .limit(40),
    ]);

    const feed = [
      ...(ratings || []).map(r => ({
        type: 'rating',
        user_id: r.user_id,
        show_id: r.show_id,
        show_name: r.show_name,
        poster_path: r.poster_path,
        rating: r.rating,
        timestamp: r.updated_at,
      })),
      ...(watchlist || []).map(r => ({
        type: r.status,
        user_id: r.user_id,
        show_id: r.show_id,
        show_name: r.show_name,
        poster_path: r.poster_path,
        timestamp: r.updated_at,
      })),
    ];

    feed.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const top = feed.slice(0, 60);

    const userIds = [...new Set(top.map(i => i.user_id).filter(Boolean))];
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, show_in_activity')
        .in('user_id', userIds);
      const profileMap = Object.fromEntries(
        (profiles || []).map(p => [p.user_id, p.show_in_activity ? p.display_name : null])
      );
      top.forEach(item => { item.display_name = profileMap[item.user_id] || null; });
    }

    return top;
  } catch {
    return [];
  }
};

export const fetchHighlight = async () => {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/highlight?select=*&limit=1`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      }
    );
    const data = await response.json();
    console.log('Highlight data:', JSON.stringify(data));
    return data[0] || null;
  } catch (error) {
    console.log('Highlight error:', error.message);
    return null;
  }
};
