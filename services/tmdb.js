const API_KEY = 'df249df3a0df066640d620b5d876ef69';
const BASE_URL = 'https://api.themoviedb.org/3';
export const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

const regionCountry = {
  Egyptian: { country: 'EG', language: 'ar' },
  Turkish: { country: 'TR', language: 'tr' },
  Gulf: { country: 'SA|AE|KW|QA|BH|OM', countries: ['SA', 'AE', 'KW', 'QA', 'BH', 'OM'], language: 'ar' },
  Syrian: { country: 'SY', language: 'ar' },
  Lebanese: { country: 'LB', language: 'ar' },
  'All Regions': { country: null, language: 'ar' },
};

import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchLibraryShowIdsByRegion } from './supabase';

const LIBRARY_CACHE_PREFIX = 'library_shows_v1_';
const LIBRARY_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

const getCachedLibraryIds = async (region) => {
  try {
    const json = await AsyncStorage.getItem(`${LIBRARY_CACHE_PREFIX}${region}`);
    if (!json) return null;
    const { ids, timestamp } = JSON.parse(json);
    if (Date.now() - timestamp > LIBRARY_CACHE_TTL) return null;
    return ids;
  } catch { return null; }
};

const setCachedLibraryIds = async (region, ids) => {
  try {
    await AsyncStorage.setItem(`${LIBRARY_CACHE_PREFIX}${region}`, JSON.stringify({ ids, timestamp: Date.now() }));
  } catch {}
};

const eraDateRange = {
  Classic: { gte: '1970-01-01', lte: '2009-12-31' },
  Modern: { gte: '2010-01-01', lte: '2019-12-31' },
  Recent: { gte: '2020-01-01', lte: null },
  Ramadan: { gte: '2015-01-01', lte: null, months: [3, 4, 5] },
};

const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export const searchShows = async (query, region, language = 'en') => {
  try {
    const { country, countries, language: origLang } = regionCountry[region] || {};
    const res = await fetch(`${BASE_URL}/search/tv?api_key=${API_KEY}&query=${encodeURIComponent(query)}&language=${language}`);
    const data = await res.json();
    const countryList = countries || (country ? [country] : null);
    const featuredIds = new Set(featuredShowIds[region] || []);
    return (data.results || []).filter(s =>
      s.poster_path &&
      (!origLang || s.original_language === origLang) &&
      (!countryList || (s.origin_country || []).some(c => countryList.includes(c)) || featuredIds.has(s.id))
    );
  } catch {
    return [];
  }
};

const fetchAllPages = async (baseUrl, maxPages) => {
  const first = await fetch(`${baseUrl}&page=1`).then(r => r.json()).catch(() => ({ results: [], total_pages: 1 }));
  const totalPages = Math.min(first.total_pages || 1, maxPages);
  if (totalPages <= 1) return first.results || [];
  const rest = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, i) =>
      fetch(`${baseUrl}&page=${i + 2}`).then(r => r.json()).catch(() => ({ results: [] }))
    )
  );
  return [first, ...rest].flatMap(d => d.results || []);
};

export const fetchTMDBSection = async (type, language = 'en') => {
  try {
    const apiLang = language === 'ar' ? 'ar' : 'en';
    const today = new Date().toISOString().split('T')[0];
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const recentCutoff = sixMonthsAgo.toISOString().split('T')[0];

    const sixMonthsAhead = new Date();
    sixMonthsAhead.setMonth(sixMonthsAhead.getMonth() + 6);
    const futureCutoff = sixMonthsAhead.toISOString().split('T')[0];

    const params = type === 'recent'
      ? `first_air_date.gte=${recentCutoff}&first_air_date.lte=${today}&sort_by=first_air_date.desc&without_genres=16`
      : type === 'popular'
      ? `sort_by=vote_count.desc&without_genres=16`
      : type === 'upcoming'
      ? `first_air_date.gte=${today}&first_air_date.lte=${futureCutoff}&sort_by=first_air_date.asc&without_genres=16`
      : `first_air_date.lte=1999-12-31&sort_by=vote_count.desc&without_genres=16`;

    const maxPages = type === 'recent' ? 5 : type === 'upcoming' ? 3 : type === 'popular' ? 2 : 2;
    const arBase = `${BASE_URL}/discover/tv?api_key=${API_KEY}&with_original_language=ar&${params}&language=${apiLang}`;
    const trBase = `${BASE_URL}/discover/tv?api_key=${API_KEY}&with_original_language=tr&${params}&language=${apiLang}`;
    const gulfBase = `${BASE_URL}/discover/tv?api_key=${API_KEY}&with_origin_country=SA&${params}&language=${apiLang}`;

    const [arResults, trResults, gulfResults] = await Promise.all([
      fetchAllPages(arBase, maxPages),
      type === 'old' ? Promise.resolve([]) : fetchAllPages(trBase, maxPages),
      type === 'recent' || type === 'upcoming' ? fetchAllPages(gulfBase, 2) : Promise.resolve([]),
    ]);

    const dedup = (arr) => arr.filter(s => s.poster_path).filter((s, i, a) => a.findIndex(x => x.id === s.id) === i);

    if (type === 'popular' || type === 'upcoming') {
      const ar = dedup([...arResults, ...gulfResults]);
      const tr = dedup(trResults);
      const interleaved = [];
      for (let i = 0; i < Math.max(ar.length, tr.length); i++) {
        if (i < ar.length) interleaved.push(ar[i]);
        if (i < tr.length) interleaved.push(tr[i]);
      }
      return interleaved.filter((s, i, a) => a.findIndex(x => x.id === s.id) === i);
    }

    const unique = dedup([...arResults, ...trResults, ...gulfResults]);
    return type === 'recent'
      ? unique.sort((a, b) => (b.first_air_date || '').localeCompare(a.first_air_date || ''))
      : unique.sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0));
  } catch { return []; }
};

export const searchShowsGlobal = async (query, language = 'en', libraryIds = new Set()) => {
  try {
    const apiLang = language === 'ar' ? 'ar' : 'en';
    const titleCased = query.replace(/\b\w/g, c => c.toUpperCase());
    const urls = [
      `${BASE_URL}/search/tv?api_key=${API_KEY}&query=${encodeURIComponent(query)}&language=${apiLang}&page=1`,
    ];
    if (titleCased !== query) {
      urls.push(`${BASE_URL}/search/tv?api_key=${API_KEY}&query=${encodeURIComponent(titleCased)}&language=${apiLang}&page=1`);
    }
    const responses = await Promise.all(urls.map(u => fetch(u)));
    const jsons = await Promise.all(responses.map(r => r.json()));
    const combined = jsons.flatMap(d => d.results || []);
    const seen = new Set();
    const unique = combined.filter(s => { if (seen.has(s.id)) return false; seen.add(s.id); return true; });
    return unique.filter(s => s.poster_path && (s.original_language === 'ar' || s.original_language === 'tr' || libraryIds.has(s.id)));
  } catch { return []; }
};

export const searchPerson = async (query, language = 'en') => {
  try {
    const res = await fetch(`${BASE_URL}/search/person?api_key=${API_KEY}&query=${encodeURIComponent(query)}&language=${language}`);
    const data = await res.json();
    return (data.results || []).filter(person =>
      (person.known_for || []).some(work => work.original_language === 'ar' || work.original_language === 'tr')
    );
  } catch {
    return [];
  }
};

export const fetchPersonDetails = async (personId, language = 'en') => {
  try {
    const res = await fetch(`${BASE_URL}/person/${personId}?api_key=${API_KEY}&language=${language}`);
    return await res.json();
  } catch {
    return null;
  }
};

export const fetchPersonTVCredits = async (personId, language = 'en') => {
  try {
    const res = await fetch(`${BASE_URL}/person/${personId}/tv_credits?api_key=${API_KEY}&language=${language}`);
    const data = await res.json();
    const credits = (data.cast || [])
      .filter((s) => s.poster_path && ['ar', 'tr'].includes(s.original_language))
      .sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0));
    const unique = credits.filter((s, i, self) => self.findIndex(x => x.id === s.id) === i);
    return unique;
  } catch {
    return [];
  }
};

export const fetchWatchProviders = async (showId) => {
  try {
    const res = await fetch(`${BASE_URL}/tv/${showId}/watch/providers?api_key=${API_KEY}`);
    const data = await res.json();
    // Try Middle East countries in order of relevance
    const results = data.results || {};
    const region = results['BH'] || results['SA'] || results['AE'] || results['EG'] || results['US'] || null;
    if (!region) return [];
    const blockedProviders = ['peacock', 'hulu', 'hbo', 'paramount+', 'showtime', 'tubi', 'fubo'];
    const providers = [...(region.flatrate || []), ...(region.free || []), ...(region.ads || [])];
    const unique = providers.filter((p, index, self) =>
      self.findIndex(x => x.provider_name === p.provider_name) === index &&
      !blockedProviders.some(b => p.provider_name.toLowerCase().includes(b))
    );
    return unique;
  } catch {
    return [];
  }
};

export const fetchShowById = async (showId, language = 'en') => {
  try {
    const res = await fetch(`${BASE_URL}/tv/${showId}?api_key=${API_KEY}&language=${language}`);
    return await res.json();
  } catch (error) {
    return null;
  }
};

export const fetchLatestEpisode = async (showId) => {
  try {
    const showRes = await fetch(`${BASE_URL}/tv/${showId}?api_key=${API_KEY}`);
    const showData = await showRes.json();
    if (showData.last_episode_to_air) return showData.last_episode_to_air;
    return null;
  } catch (error) {
    return null;
  }
};

// Shows that must always appear regardless of popularity/vote count
const featuredShowIds = {
  Egyptian: [261747, 260606, 260605, 260608, 271790, 271076, 246496, 257812, 246706, 246244, 224882, 244644, 246705, 218739, 218324, 219256, 217952, 202040, 194677, 155590, 158650, 154810, 139471, 122543, 121487, 121623, 104043, 106590, 102049, 102376, 102045, 102041, 94047, 98793, 98632, 88928, 88929, 79650, 79643, 79640, 75165, 56451, 72048, 72207, 72136, 72298, 72205, 72334, 72989, 68015, 71688, 84333, 82313, 86333, 66193, 84780, 96202, 78619, 81810, 44446, 52698, 53979, 62457, 84774, 73782, 53981, 53813, 110477, 220904, 110491, 86325, 90674, 52560, 106180, 215746, 313371, 104395, 100530],
  Syrian: [94133, 95355, 95956, 296791, 295658],
  Lebanese: [319776, 319779, 13921, 84299],
  Gulf: [290649, 283620, 284483, 277991, 251691, 247634, 245980, 248623, 237121, 218184, 213272, 131046, 123335, 123153, 112311, 111737, 136487, 95133, 89166, 84289, 71926, 213641, 195358, 231346, 261840, 58887, 132865, 231345, 231660, 231286, 201154, 201156, 87948, 231158, 249134, 248976, 248975, 113091, 248962, 248848, 248851, 274758, 234931, 67699, 248641, 201143, 211597, 248629, 201167, 248507, 249209, 57402, 79567, 314162, 314401, 248668, 196231, 201575, 128486, 80002, 213307, 128240, 319937],
  Turkish: [1400, 121, 46261, 67879, 71676, 70695, 107228, 46260, 112130, 84696, 46197],
};

const fetchShowsByIds = async (ids, language = 'en') => {
  const results = await Promise.all(
    ids.map(id =>
      fetch(`${BASE_URL}/tv/${id}?api_key=${API_KEY}&language=${language}`)
        .then(r => r.json())
        .catch(() => null)
    )
  );
  return results.filter(s => s && s.poster_path);
};

const buildParams = (region, era = null, page, sortBy = 'popularity.desc') => {
  const { country, language } = regionCountry[region] || {};
  const dateRange = era ? (eraDateRange[era] || {}) : {};

  let params = `api_key=${API_KEY}&sort_by=${sortBy}&page=${page}&without_genres=16`;
  if (language) params += `&with_original_language=${language}`;
  if (country) params += `&with_origin_country=${country}`;
  if (dateRange.gte) params += `&first_air_date.gte=${dateRange.gte}`;
  if (dateRange.lte) params += `&first_air_date.lte=${dateRange.lte}`;
  return params;
};

const filterResults = (results, era = null) => {
  let filtered = results.filter((s) => s.poster_path);
  if (era === 'Ramadan') {
    const months = eraDateRange.Ramadan.months;
    filtered = filtered.filter((s) => {
      if (!s.first_air_date) return false;
      const month = new Date(s.first_air_date).getMonth() + 1;
      return months.includes(month);
    });
  }
  return filtered;
};

export const fetchShows = async (region, era, language = 'en') => {
  const randomPage = Math.floor(Math.random() * 4) + 1;
  try {
    const [response, featured] = await Promise.all([
      fetch(`${BASE_URL}/discover/tv?${buildParams(region, era, randomPage)}&language=${language}`),
      featuredShowIds[region] ? fetchShowsByIds(featuredShowIds[region], language) : Promise.resolve([]),
    ]);
    const data = await response.json();
    const regular = filterResults(data.results || [], era).slice(0, 8);
    const featuredFiltered = featured.filter(f => !regular.some(r => r.id === f.id));
    return shuffleArray([...featuredFiltered, ...regular]);
  } catch (error) {
    console.error('TMDB error:', error);
    return [];
  }
};

export const fetchAllShows = async (region, era = null, language = 'en', sortBy = 'popularity.desc', onShowsAdded = null) => {
  try {
    const lowVoteRegions = ['Syrian', 'Lebanese', 'Gulf', 'Egyptian'];
    const voteFilter = sortBy === 'first_air_date.desc' && !lowVoteRegions.includes(region) ? '&vote_count.gte=10' : '';
    const [pages, featured] = await Promise.all([
      Promise.all(
        [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((page) =>
          fetch(`${BASE_URL}/discover/tv?${buildParams(region, era, page, sortBy)}&language=${language}${voteFilter}`).then((r) => r.json())
        )
      ),
      featuredShowIds[region] ? fetchShowsByIds(featuredShowIds[region], language) : Promise.resolve([]),
    ]);
    const allResults = pages.flatMap((data) => filterResults(data.results || [], era));
    const combined = [...featured, ...allResults];
    const unique = combined.filter((show, index, self) => self.findIndex((s) => s.id === show.id) === index);
    const sorted = sortBy === 'first_air_date.desc'
      ? unique.sort((a, b) => (b.first_air_date || '').localeCompare(a.first_air_date || ''))
      : unique;

    // Background-fill missing library shows
    if (onShowsAdded) {
      (async () => {
        try {
          let libraryIds = await getCachedLibraryIds(region);
          if (!libraryIds) {
            libraryIds = await fetchLibraryShowIdsByRegion(region);
            await setCachedLibraryIds(region, libraryIds);
          }
          const fetchedIds = new Set(sorted.map(s => s.id));
          const missingIds = libraryIds.filter(id => !fetchedIds.has(id));
          if (missingIds.length === 0) return;
          const batchSize = 20;
          for (let i = 0; i < missingIds.length; i += batchSize) {
            const batch = missingIds.slice(i, i + batchSize);
            const fetched = await fetchShowsByIds(batch, language);
            const valid = fetched.filter(s => s && s.poster_path);
            if (valid.length > 0) onShowsAdded(valid);
            if (i + batchSize < missingIds.length) await new Promise(r => setTimeout(r, 300));
          }
        } catch {}
      })();
    }

    return sorted;
  } catch (error) {
    console.error('TMDB error:', error);
    return [];
  }
};

export const fetchNewReleases = async (region, language = 'en') => {
  try {
    const pages = await Promise.all(
      [1, 2, 3].map((page) =>
        fetch(`${BASE_URL}/discover/tv?${buildParams(region, 'Recent', page, 'first_air_date.desc')}&language=${language}`).then((r) => r.json())
      )
    );
    const allResults = pages.flatMap((data) => filterResults(data.results || [], 'Recent'));
    const unique = allResults.filter((show, index, self) => self.findIndex((s) => s.id === show.id) === index);
    return unique;
  } catch (error) {
    console.error('TMDB error:', error);
    return [];
  }
};
