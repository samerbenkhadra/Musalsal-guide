require("dotenv").config();
const TMDB_API_KEY = 'df249df3a0df066640d620b5d876ef69';
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;
const SUPABASE_URL = 'https://nkhhtznlasaqpatyzecp.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_SERVICE_KEY;
const TMDB_BASE = 'https://api.themoviedb.org/3';

const regions = [
  { name: 'Egyptian',  country: 'EG', language: 'ar', lowVote: false },
  { name: 'Turkish',   country: 'TR', language: 'tr', lowVote: false },
  { name: 'Lebanese',  country: 'LB', language: 'ar', lowVote: true  },
  { name: 'Syrian',    country: 'SY', language: 'ar', lowVote: true  },
  { name: 'Gulf',      country: 'SA', language: 'ar', lowVote: true  },
];

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const fetchShows = async (region) => {
  const results = [];
  const voteFilter = region.lowVote ? '' : '&vote_count.gte=10';
  for (let page = 1; page <= 10; page++) {
    let url = `${TMDB_BASE}/discover/tv?api_key=${TMDB_API_KEY}&sort_by=first_air_date.desc&page=${page}${voteFilter}`;
    if (region.language) url += `&with_original_language=${region.language}`;
    if (region.country)  url += `&with_origin_country=${region.country}`;
    const res = await fetch(url);
    const data = await res.json();
    results.push(...(data.results || []).filter(s => s.poster_path));
  }
  for (let page = 1; page <= 3; page++) {
    let url = `${TMDB_BASE}/discover/tv?api_key=${TMDB_API_KEY}&sort_by=popularity.desc&page=${page}`;
    if (region.language) url += `&with_original_language=${region.language}`;
    if (region.country)  url += `&with_origin_country=${region.country}`;
    const res = await fetch(url);
    const data = await res.json();
    results.push(...(data.results || []).filter(s => s.poster_path));
  }
  return results.filter((s, i, self) => self.findIndex(x => x.id === s.id) === i);
};

const getExistingIds = async () => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/show_scores?select=show_id`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
  });
  const data = await res.json();
  return new Set((data || []).map(r => r.show_id));
};

const scoreShow = async (show) => {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
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
      messages: [{ role: 'user', content: `Show: ${show.name}\nCountry of origin: ${show.origin_country?.[0] || 'Unknown'}\nFirst aired: ${show.first_air_date || 'Unknown'}\nDescription: ${show.overview || 'No description available.'}` }],
    }),
  });
  const data = await res.json();
  const text = data.content?.[0]?.text || '{}';
  const match = text.match(/\{[\s\S]*\}/);
  return JSON.parse(match ? match[0] : '{}');
};

const saveScore = async (showId, scores) => {
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
};

const run = async () => {
  console.log('Fetching existing scores from Supabase...');
  const existingIds = await getExistingIds();
  console.log(`Already scored: ${existingIds.size} shows\n`);

  let allShows = [];
  for (const region of regions) {
    console.log(`Fetching ${region.name} shows...`);
    const shows = await fetchShows(region);
    allShows.push(...shows);
  }

  // dedupe across regions
  allShows = allShows.filter((s, i, self) => self.findIndex(x => x.id === s.id) === i);
  const toScore = allShows.filter(s => !existingIds.has(s.id));

  console.log(`\nTotal unique shows: ${allShows.length}`);
  console.log(`Already scored: ${existingIds.size}`);
  console.log(`To score: ${toScore.length}\n`);

  let done = 0;
  const batchSize = 5;

  for (let i = 0; i < toScore.length; i += batchSize) {
    const batch = toScore.slice(i, i + batchSize);
    await Promise.all(batch.map(async (show) => {
      try {
        const scores = await scoreShow(show);
        await saveScore(show.id, scores);
        done++;
        console.log(`[${done}/${toScore.length}] ✓ ${show.name}`);
      } catch (e) {
        console.log(`[${done}/${toScore.length}] ✗ ${show.name} — ${e.message}`);
      }
    }));
    if (i + batchSize < toScore.length) await sleep(300);
  }

  console.log(`\nDone. ${done} shows scored and saved to Supabase.`);
};

run().catch(console.error);
