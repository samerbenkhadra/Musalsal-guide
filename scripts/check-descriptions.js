const API_KEY = 'df249df3a0df066640d620b5d876ef69';
const BASE_URL = 'https://api.themoviedb.org/3';
const SUPABASE_URL = 'https://nkhhtznlasaqpatyzecp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5raGh0em5sYXNhcXBhdHl6ZWNwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDg3MzE3MSwiZXhwIjoyMDkwNDQ5MTcxfQ.KunWmsYbfhgogDFGkiP_aVIar1UhJMpOTRTrm5m2SpM';
const XLSX = require('xlsx');
const path = require('path');

const regions = [
  { name: 'Egyptian',  country: 'EG', language: 'ar', lowVote: false, wellKnown: true  },
  { name: 'Turkish',   country: 'TR', language: 'tr', lowVote: false, wellKnown: true  },
  { name: 'Lebanese',  country: 'LB', language: 'ar', lowVote: true,  wellKnown: false },
  { name: 'Syrian',    country: 'SY', language: 'ar', lowVote: true,  wellKnown: false },
  { name: 'Gulf',      country: 'SA|AE|KW|QA|BH|OM|YE', language: 'ar', lowVote: true,  wellKnown: false },
];

const getAccuracy = (show, region) => {
  const year = show.first_air_date ? parseInt(show.first_air_date.slice(0, 4)) : 0;
  const hasDesc = show.overview && show.overview.trim().length > 20;
  const postCutoff = year > 2025 || (year === 2025 && show.first_air_date > '2025-08');

  if (postCutoff || !hasDesc) return 'Low';
  if (region.wellKnown && hasDesc) return 'High';
  return 'Medium';
};

const fetchShows = async (region) => {
  const results = [];
  const voteFilter = region.lowVote ? '' : '&vote_count.gte=10';

  for (let page = 1; page <= 10; page++) {
    let url = `${BASE_URL}/discover/tv?api_key=${API_KEY}&sort_by=first_air_date.desc&page=${page}${voteFilter}`;
    if (region.language) url += `&with_original_language=${region.language}`;
    if (region.country)  url += `&with_origin_country=${region.country}`;
    const res = await fetch(url);
    const data = await res.json();
    results.push(...(data.results || []).filter(s => s.poster_path));
  }

  for (let page = 1; page <= 3; page++) {
    let url = `${BASE_URL}/discover/tv?api_key=${API_KEY}&sort_by=popularity.desc&page=${page}`;
    if (region.language) url += `&with_original_language=${region.language}`;
    if (region.country)  url += `&with_origin_country=${region.country}`;
    const res = await fetch(url);
    const data = await res.json();
    results.push(...(data.results || []).filter(s => s.poster_path));
  }

  return results.filter((s, i, self) => self.findIndex(x => x.id === s.id) === i);
};

const fetchWhereToWatch = async () => {
  const map = {};
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/where_to_watch?select=show_id,platform,url`,
    { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
  );
  const data = await res.json();
  (Array.isArray(data) ? data : []).forEach(row => { map[row.show_id] = row.platform || row.url; });
  return map;
};

const fetchBlockedShows = async () => {
  const blocked = new Set();
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/blocked_shows?select=show_id`,
    { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
  );
  const data = await res.json();
  (Array.isArray(data) ? data : []).forEach(row => blocked.add(row.show_id));
  return blocked;
};

const fetchSupabaseScores = async (showIds) => {
  const scored = new Set();
  const batchSize = 100;
  for (let i = 0; i < showIds.length; i += batchSize) {
    const batch = showIds.slice(i, i + batchSize);
    const filter = batch.join(',');
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/show_scores?show_id=in.(${filter})&select=show_id`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
    );
    const data = await res.json();
    if (i === 0) console.log('Supabase sample response:', JSON.stringify(data).slice(0, 200));
    (Array.isArray(data) ? data : []).forEach(row => scored.add(row.show_id));
  }
  return scored;
};

const run = async () => {
  const workbook = XLSX.utils.book_new();

  for (const region of regions) {
    console.log(`Fetching ${region.name}...`);
    const shows = await fetchShows(region);

    console.log(`Checking Supabase scores for ${region.name}...`);
    const [scoredIds, blockedIds, watchMap] = await Promise.all([
      fetchSupabaseScores(shows.map(s => s.id)),
      fetchBlockedShows(),
      fetchWhereToWatch(),
    ]);

    const rows = shows.map(show => ({
      'Show Name': show.name,
      'TMDB ID': show.id,
      'First Air Date': show.first_air_date || 'Unknown',
      'Description': show.overview && show.overview.trim().length > 20 ? '✓' : '✗ MISSING',
      'Remove?': blockedIds.has(show.id) ? 'Yes' : '',
      'Where to Watch': watchMap[show.id] || '',
      'Theme Accuracy': getAccuracy(show, region),
      'In Supabase?': scoredIds.has(show.id) ? 'Yes' : 'No',
      'Scores Showing?': '',
      'Romance (0-100)': '',
      'Drama (0-100)': '',
      'Suspense (0-100)': '',
      'Betrayal (0-100)': '',
      'Comedy (0-100)': '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet['!cols'] = [{ wch: 50 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 10 }, { wch: 20 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(workbook, worksheet, region.name);
  }

  const outputPath = path.join(__dirname, 'shows_report.xlsx');
  XLSX.writeFile(workbook, outputPath);
  console.log(`\nExported to ${outputPath}`);
};

run().catch(console.error);
