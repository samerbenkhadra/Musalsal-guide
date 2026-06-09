import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

const KEY = 'watched_shows_v1';
const RATINGS_KEY = 'show_ratings_v1';
const SAVED_KEY = 'saved_shows_v1';
const SHOW_META_KEY = 'show_meta_v1';
const MIGRATION_KEY = 'supabase_migrated_v1';

// ─── helpers ────────────────────────────────────────────────────────────────

const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

const getWatchedSetLocal = async () => {
  try {
    const json = await AsyncStorage.getItem(KEY);
    return new Set(json ? JSON.parse(json) : []);
  } catch { return new Set(); }
};

const getRatingsMapLocal = async () => {
  try {
    const json = await AsyncStorage.getItem(RATINGS_KEY);
    return json ? JSON.parse(json) : {};
  } catch { return {}; }
};

const getSavedSetLocal = async () => {
  try {
    const json = await AsyncStorage.getItem(SAVED_KEY);
    return new Set(json ? JSON.parse(json) : []);
  } catch { return new Set(); }
};

const getMetaMap = async () => {
  try {
    const json = await AsyncStorage.getItem(SHOW_META_KEY);
    return json ? JSON.parse(json) : {};
  } catch { return {}; }
};

const storeShowMeta = async (show) => {
  if (!show?.id) return;
  const meta = await getMetaMap();
  meta[Number(show.id)] = {
    id: show.id,
    name: show.name,
    poster_path: show.poster_path || null,
    first_air_date: show.first_air_date || null,
  };
  try { await AsyncStorage.setItem(SHOW_META_KEY, JSON.stringify(meta)); } catch {}
};

// ─── migration ───────────────────────────────────────────────────────────────

export const migrateToSupabase = async (userId) => {
  try {
    const migrated = await AsyncStorage.getItem(MIGRATION_KEY);
    if (migrated) return;

    const [watchedSet, savedSet, ratingsMap, metaMap] = await Promise.all([
      getWatchedSetLocal(), getSavedSetLocal(), getRatingsMapLocal(), getMetaMap(),
    ]);

    const watchlistRows = [
      ...[...watchedSet].map(id => ({
        user_id: userId, show_id: id, status: 'watched',
        show_name: metaMap[id]?.name || null,
        poster_path: metaMap[id]?.poster_path || null,
        first_air_date: metaMap[id]?.first_air_date || null,
      })),
      ...[...savedSet].filter(id => !watchedSet.has(id)).map(id => ({
        user_id: userId, show_id: id, status: 'want_to_watch',
        show_name: metaMap[id]?.name || null,
        poster_path: metaMap[id]?.poster_path || null,
        first_air_date: metaMap[id]?.first_air_date || null,
      })),
    ];

    const ratingRows = Object.entries(ratingsMap).map(([showId, rating]) => ({
      user_id: userId, show_id: Number(showId), rating,
      show_name: metaMap[Number(showId)]?.name || null,
      poster_path: metaMap[Number(showId)]?.poster_path || null,
    }));

    await Promise.all([
      watchlistRows.length > 0 ? supabase.from('user_watchlist').upsert(watchlistRows, { onConflict: 'user_id,show_id' }) : null,
      ratingRows.length > 0 ? supabase.from('user_ratings').upsert(ratingRows, { onConflict: 'user_id,show_id' }) : null,
    ]);

    await AsyncStorage.setItem(MIGRATION_KEY, 'true');
  } catch {}
};

// ─── watched ─────────────────────────────────────────────────────────────────

export const getWatchedShows = async () => {
  const user = await getCurrentUser();
  if (user) {
    const { data } = await supabase.from('user_watchlist').select('show_id').eq('user_id', user.id).eq('status', 'watched');
    return new Set((data || []).map(r => r.show_id));
  }
  return getWatchedSetLocal();
};

export const getWatchedCount = async () => {
  const watched = await getWatchedShows();
  return watched.size;
};

export const toggleWatched = async (showId, show = null) => {
  const id = Number(showId);
  const user = await getCurrentUser();

  if (user) {
    const { data } = await supabase.from('user_watchlist').select('id').eq('user_id', user.id).eq('show_id', id).single();
    if (data) {
      await supabase.from('user_watchlist').delete().eq('user_id', user.id).eq('show_id', id);
    } else {
      await supabase.from('user_watchlist').upsert({
        user_id: user.id, show_id: id, status: 'watched',
        show_name: show?.name || null,
        poster_path: show?.poster_path || null,
        first_air_date: show?.first_air_date || null,
      }, { onConflict: 'user_id,show_id' });
    }
    return getWatchedShows();
  }

  const watched = await getWatchedSetLocal();
  if (watched.has(id)) { watched.delete(id); } else { watched.add(id); if (show) await storeShowMeta(show); }
  try { await AsyncStorage.setItem(KEY, JSON.stringify([...watched])); } catch {}
  return watched;
};

export const markWatched = async (showId, show = null) => {
  const id = Number(showId);
  const user = await getCurrentUser();

  if (user) {
    await supabase.from('user_watchlist').upsert({
      user_id: user.id, show_id: id, status: 'watched',
      show_name: show?.name || null,
      poster_path: show?.poster_path || null,
      first_air_date: show?.first_air_date || null,
    }, { onConflict: 'user_id,show_id' });
    return getWatchedShows();
  }

  const watched = await getWatchedSetLocal();
  watched.add(id);
  if (show) await storeShowMeta(show);
  try { await AsyncStorage.setItem(KEY, JSON.stringify([...watched])); } catch {}
  return watched;
};

export const getWatchedShowsWithMeta = async () => {
  const user = await getCurrentUser();
  if (user) {
    const { data } = await supabase.from('user_watchlist').select('show_id, show_name, poster_path, first_air_date, updated_at').eq('user_id', user.id).eq('status', 'watched').order('updated_at', { ascending: false });
    return (data || []).map(r => ({ id: r.show_id, name: r.show_name, poster_path: r.poster_path, first_air_date: r.first_air_date })).filter(s => s.name);
  }
  const [watched, meta, ratings] = await Promise.all([getWatchedSetLocal(), getMetaMap(), getRatingsMapLocal()]);
  return [...watched].map(id => meta[id] ? { ...meta[id], rating: ratings[id] || null } : null).filter(Boolean).reverse();
};

// ─── saved (want to watch) ────────────────────────────────────────────────────

export const getSavedShows = async () => {
  const user = await getCurrentUser();
  if (user) {
    const { data } = await supabase.from('user_watchlist').select('show_id').eq('user_id', user.id).eq('status', 'want_to_watch');
    return new Set((data || []).map(r => r.show_id));
  }
  return getSavedSetLocal();
};

export const toggleSaved = async (showId, show = null) => {
  const id = Number(showId);
  const user = await getCurrentUser();

  if (user) {
    const { data } = await supabase.from('user_watchlist').select('id, status').eq('user_id', user.id).eq('show_id', id).single();
    if (data?.status === 'want_to_watch') {
      await supabase.from('user_watchlist').delete().eq('user_id', user.id).eq('show_id', id);
    } else {
      await supabase.from('user_watchlist').upsert({
        user_id: user.id, show_id: id, status: 'want_to_watch',
        show_name: show?.name || null,
        poster_path: show?.poster_path || null,
        first_air_date: show?.first_air_date || null,
      }, { onConflict: 'user_id,show_id' });
    }
    return getSavedShows();
  }

  const saved = await getSavedSetLocal();
  if (saved.has(id)) { saved.delete(id); } else { saved.add(id); if (show) await storeShowMeta(show); }
  try { await AsyncStorage.setItem(SAVED_KEY, JSON.stringify([...saved])); } catch {}
  return saved;
};

export const getSavedShowsWithMeta = async () => {
  const user = await getCurrentUser();
  if (user) {
    const { data } = await supabase.from('user_watchlist').select('show_id, show_name, poster_path, first_air_date, updated_at').eq('user_id', user.id).eq('status', 'want_to_watch').order('updated_at', { ascending: false });
    return (data || []).map(r => ({ id: r.show_id, name: r.show_name, poster_path: r.poster_path, first_air_date: r.first_air_date })).filter(s => s.name);
  }
  const [saved, meta] = await Promise.all([getSavedSetLocal(), getMetaMap()]);
  return [...saved].map(id => meta[id] || null).filter(Boolean).reverse();
};

// ─── ratings ──────────────────────────────────────────────────────────────────

export const saveRating = async (showId, rating, show = null) => {
  const id = Number(showId);
  const user = await getCurrentUser();

  if (user) {
    const ratings = await getRatingsMapLocal();
    ratings[id] = rating;
    try { await AsyncStorage.setItem(RATINGS_KEY, JSON.stringify(ratings)); } catch {}
    await supabase.from('user_ratings').upsert({
      user_id: user.id, show_id: id, rating,
      show_name: show?.name || null,
      poster_path: show?.poster_path || null,
    }, { onConflict: 'user_id,show_id' });
    return;
  }

  const ratings = await getRatingsMapLocal();
  ratings[id] = rating;
  try { await AsyncStorage.setItem(RATINGS_KEY, JSON.stringify(ratings)); } catch {}
};

export const removeRating = async (showId) => {
  const id = Number(showId);
  const user = await getCurrentUser();

  if (user) {
    const ratings = await getRatingsMapLocal();
    delete ratings[id];
    try { await AsyncStorage.setItem(RATINGS_KEY, JSON.stringify(ratings)); } catch {}
    await supabase.from('user_ratings').delete().eq('user_id', user.id).eq('show_id', id);
    return;
  }

  const ratings = await getRatingsMapLocal();
  delete ratings[id];
  try { await AsyncStorage.setItem(RATINGS_KEY, JSON.stringify(ratings)); } catch {}
};

export const getRating = async (showId) => {
  const id = Number(showId);
  const user = await getCurrentUser();

  if (user) {
    const { data } = await supabase.from('user_ratings').select('rating').eq('user_id', user.id).eq('show_id', id).single();
    const ratings = await getRatingsMapLocal();
    if (data?.rating) {
      ratings[id] = data.rating;
    } else {
      delete ratings[id];
    }
    try { await AsyncStorage.setItem(RATINGS_KEY, JSON.stringify(ratings)); } catch {}
    return data?.rating || null;
  }

  const ratings = await getRatingsMapLocal();
  return ratings[id] || null;
};

export const getAllRatings = async () => {
  const user = await getCurrentUser();

  if (user) {
    const { data } = await supabase.from('user_ratings').select('show_id, rating').eq('user_id', user.id);
    return Object.fromEntries((data || []).map(r => [r.show_id, r.rating]));
  }

  return getRatingsMapLocal();
};

export const getWatchingShows = async () => {
  const user = await getCurrentUser();
  if (user) {
    const { data } = await supabase.from('user_watchlist').select('show_id').eq('user_id', user.id).eq('status', 'watching');
    return new Set((data || []).map(r => r.show_id));
  }
  return new Set();
};

export const getWatchingShowsWithMeta = async () => {
  const user = await getCurrentUser();
  if (user) {
    const { data } = await supabase.from('user_watchlist').select('show_id, show_name, poster_path, first_air_date, updated_at').eq('user_id', user.id).eq('status', 'watching').order('updated_at', { ascending: false });
    return (data || []).map(r => ({ id: r.show_id, name: r.show_name, poster_path: r.poster_path, first_air_date: r.first_air_date })).filter(s => s.name);
  }
  return [];
};

export const toggleWatching = async (showId, show = null) => {
  const id = Number(showId);
  const user = await getCurrentUser();
  if (!user) return false;
  const { data } = await supabase.from('user_watchlist').select('id, status').eq('user_id', user.id).eq('show_id', id).single();
  if (data?.status === 'watching') {
    await supabase.from('user_watchlist').delete().eq('user_id', user.id).eq('show_id', id);
  } else {
    await supabase.from('user_watchlist').upsert({
      user_id: user.id, show_id: id, status: 'watching',
      show_name: show?.name || null,
      poster_path: show?.poster_path || null,
      first_air_date: show?.first_air_date || null,
    }, { onConflict: 'user_id,show_id' });
  }
  return true;
};

export const getShowWatchStatus = async (showId) => {
  const id = Number(showId);
  const user = await getCurrentUser();
  if (user) {
    const { data } = await supabase.from('user_watchlist')
      .select('status')
      .eq('user_id', user.id)
      .eq('show_id', id)
      .single();
    return {
      isWatched: data?.status === 'watched',
      isWantToWatch: data?.status === 'want_to_watch',
      isWatching: data?.status === 'watching',
    };
  }
  const [watched, saved] = await Promise.all([getWatchedSetLocal(), getSavedSetLocal()]);
  return { isWatched: watched.has(id), isWantToWatch: saved.has(id), isWatching: false };
};

export const getRatedShowsWithMeta = async () => {
  const user = await getCurrentUser();
  if (user) {
    const { data } = await supabase.from('user_ratings').select('show_id, show_name, poster_path, rating, updated_at').eq('user_id', user.id).order('updated_at', { ascending: false });
    return (data || []).map(r => ({ id: r.show_id, name: r.show_name, poster_path: r.poster_path, rating: r.rating })).filter(s => s.name);
  }
  const [ratings, meta] = await Promise.all([getRatingsMapLocal(), getMetaMap()]);
  return Object.entries(ratings).map(([id, rating]) => meta[Number(id)] ? { ...meta[Number(id)], rating } : null).filter(Boolean);
};
