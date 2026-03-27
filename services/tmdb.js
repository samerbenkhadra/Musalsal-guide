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

export const fetchShows = async (region, era) => {
  const { country, language } = regionCountry[region] || {};
  const dateRange = eraDateRange[era] || {};
  const randomPage = Math.floor(Math.random() * 4) + 1;

  let params = `api_key=${API_KEY}&sort_by=popularity.desc&page=${randomPage}`;

  if (language) params += `&with_original_language=${language}`;
  if (country) params += `&with_origin_country=${country}`;
  if (dateRange.gte) params += `&first_air_date.gte=${dateRange.gte}`;
  if (dateRange.lte) params += `&first_air_date.lte=${dateRange.lte}`;

  try {
    const response = await fetch(`${BASE_URL}/discover/tv?${params}`);
    const data = await response.json();
    let results = (data.results || []).filter((s) => s.poster_path);

    // For Ramadan, filter by shows that aired in March-May
    if (era === 'Ramadan' && dateRange.months) {
      results = results.filter((s) => {
        if (!s.first_air_date) return false;
        const month = new Date(s.first_air_date).getMonth() + 1;
        return dateRange.months.includes(month);
      });
    }

    return shuffleArray(results).slice(0, 8);
  } catch (error) {
    console.error('TMDB error:', error);
    return [];
  }
};
