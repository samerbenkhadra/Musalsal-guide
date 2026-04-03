const API_KEY = 'df249df3a0df066640d620b5d876ef69';
const BASE_URL = 'https://api.themoviedb.org/3';
export const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

const regionCountry = {
  Egyptian: { country: 'EG', language: 'ar' },
  Turkish: { country: 'TR', language: 'tr' },
  Gulf: { country: 'SA', language: 'ar' },
  Syrian: { country: 'SY', language: 'ar' },
  Lebanese: { country: 'LB', language: 'ar' },
  'All Arabic': { country: null, language: 'ar' },
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

export const searchPerson = async (query, language = 'en') => {
  try {
    const res = await fetch(`${BASE_URL}/search/person?api_key=${API_KEY}&query=${encodeURIComponent(query)}&language=${language}`);
    const data = await res.json();
    return data.results || [];
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
      .filter((s) => s.poster_path)
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
    const providers = [...(region.flatrate || []), ...(region.free || []), ...(region.ads || [])];
    const unique = providers.filter((p, index, self) => self.findIndex(x => x.provider_name === p.provider_name) === index);
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

const buildParams = (region, era, page, sortBy = 'popularity.desc') => {
  const { country, language } = regionCountry[region] || {};
  const dateRange = eraDateRange[era] || {};

  let params = `api_key=${API_KEY}&sort_by=${sortBy}&page=${page}`;
  if (language) params += `&with_original_language=${language}`;
  if (country) params += `&with_origin_country=${country}`;
  if (dateRange.gte) params += `&first_air_date.gte=${dateRange.gte}`;
  if (dateRange.lte) params += `&first_air_date.lte=${dateRange.lte}`;
  return params;
};

const filterResults = (results, era) => {
  const dateRange = eraDateRange[era] || {};
  let filtered = results.filter((s) => s.poster_path);
  if (era === 'Ramadan' && dateRange.months) {
    filtered = filtered.filter((s) => {
      if (!s.first_air_date) return false;
      const month = new Date(s.first_air_date).getMonth() + 1;
      return dateRange.months.includes(month);
    });
  }
  return filtered;
};

export const fetchShows = async (region, era, language = 'en') => {
  const randomPage = Math.floor(Math.random() * 4) + 1;
  try {
    const response = await fetch(`${BASE_URL}/discover/tv?${buildParams(region, era, randomPage)}&language=${language}`);
    const data = await response.json();
    return shuffleArray(filterResults(data.results || [], era)).slice(0, 8);
  } catch (error) {
    console.error('TMDB error:', error);
    return [];
  }
};

export const fetchAllShows = async (region, era, language = 'en') => {
  try {
    const pages = await Promise.all(
      [1, 2, 3, 4, 5].map((page) =>
        fetch(`${BASE_URL}/discover/tv?${buildParams(region, era, page)}&language=${language}`).then((r) => r.json())
      )
    );
    const allResults = pages.flatMap((data) => filterResults(data.results || [], era));
    const unique = allResults.filter((show, index, self) => self.findIndex((s) => s.id === show.id) === index);
    return unique;
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
