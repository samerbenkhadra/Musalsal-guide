import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'watched_shows_v1';
const RATINGS_KEY = 'show_ratings_v1';
const SAVED_KEY = 'saved_shows_v1';
const SHOW_META_KEY = 'show_meta_v1';

const getWatchedSet = async () => {
  try {
    const json = await AsyncStorage.getItem(KEY);
    return new Set(json ? JSON.parse(json) : []);
  } catch {
    return new Set();
  }
};

const getRatingsMap = async () => {
  try {
    const json = await AsyncStorage.getItem(RATINGS_KEY);
    return json ? JSON.parse(json) : {};
  } catch {
    return {};
  }
};

const getSavedSet = async () => {
  try {
    const json = await AsyncStorage.getItem(SAVED_KEY);
    return new Set(json ? JSON.parse(json) : []);
  } catch {
    return new Set();
  }
};

const getMetaMap = async () => {
  try {
    const json = await AsyncStorage.getItem(SHOW_META_KEY);
    return json ? JSON.parse(json) : {};
  } catch {
    return {};
  }
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
  try {
    await AsyncStorage.setItem(SHOW_META_KEY, JSON.stringify(meta));
  } catch {}
};

export const getWatchedShows = async () => {
  return await getWatchedSet();
};

export const getWatchedCount = async () => {
  const watched = await getWatchedSet();
  return watched.size;
};

export const toggleWatched = async (showId, show = null) => {
  const watched = await getWatchedSet();
  const id = Number(showId);
  if (watched.has(id)) {
    watched.delete(id);
  } else {
    watched.add(id);
    if (show) await storeShowMeta(show);
  }
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify([...watched]));
  } catch {}
  return watched;
};

export const markWatched = async (showId, show = null) => {
  const watched = await getWatchedSet();
  watched.add(Number(showId));
  if (show) await storeShowMeta(show);
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify([...watched]));
  } catch {}
  return watched;
};

export const getWatchedShowsWithMeta = async () => {
  const [watched, meta, ratings] = await Promise.all([getWatchedSet(), getMetaMap(), getRatingsMap()]);
  return [...watched]
    .map(id => meta[id] ? { ...meta[id], rating: ratings[id] || null } : null)
    .filter(Boolean)
    .reverse();
};

export const toggleSaved = async (showId, show = null) => {
  const saved = await getSavedSet();
  const id = Number(showId);
  if (saved.has(id)) {
    saved.delete(id);
  } else {
    saved.add(id);
    if (show) await storeShowMeta(show);
  }
  try {
    await AsyncStorage.setItem(SAVED_KEY, JSON.stringify([...saved]));
  } catch {}
  return saved;
};

export const getSavedShows = async () => {
  return await getSavedSet();
};

export const getSavedShowsWithMeta = async () => {
  const [saved, meta] = await Promise.all([getSavedSet(), getMetaMap()]);
  return [...saved]
    .map(id => meta[id] || null)
    .filter(Boolean)
    .reverse();
};

export const saveRating = async (showId, rating) => {
  const ratings = await getRatingsMap();
  ratings[Number(showId)] = rating;
  try {
    await AsyncStorage.setItem(RATINGS_KEY, JSON.stringify(ratings));
  } catch {}
};

export const removeRating = async (showId) => {
  const ratings = await getRatingsMap();
  delete ratings[Number(showId)];
  try {
    await AsyncStorage.setItem(RATINGS_KEY, JSON.stringify(ratings));
  } catch {}
};

export const getRating = async (showId) => {
  const ratings = await getRatingsMap();
  return ratings[Number(showId)] || null;
};

export const getAllRatings = async () => {
  return await getRatingsMap();
};
