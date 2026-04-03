import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'watched_shows_v1';

const getWatchedSet = async () => {
  try {
    const json = await AsyncStorage.getItem(KEY);
    return new Set(json ? JSON.parse(json) : []);
  } catch {
    return new Set();
  }
};

export const getWatchedShows = async () => {
  return await getWatchedSet();
};

export const toggleWatched = async (showId) => {
  const watched = await getWatchedSet();
  const id = Number(showId);
  if (watched.has(id)) {
    watched.delete(id);
  } else {
    watched.add(id);
  }
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify([...watched]));
  } catch {}
  return watched;
};
