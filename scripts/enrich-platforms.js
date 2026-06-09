const SUPABASE_URL = 'https://nkhhtznlasaqpatyzecp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5raGh0em5sYXNhcXBhdHl6ZWNwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDg3MzE3MSwiZXhwIjoyMDkwNDQ5MTcxfQ.KunWmsYbfhgogDFGkiP_aVIar1UhJMpOTRTrm5m2SpM';
const TMDB_API_KEY = 'df249df3a0df066640d620b5d876ef69';
const REGIONS = ['AE', 'SA'];

const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'resolution=merge-duplicates',
};

// Only enrich these platforms — ignore everything else TMDB returns
const PLATFORM_WHITELIST = {
  'Netflix':   { name: 'Netflix',  url: 'https://www.netflix.com' },
  'Shahid':    { name: 'Shahid',   url: 'https://shahid.mbc.net' },
  'Apple TV':  { name: 'Apple TV', url: 'https://tv.apple.com' },
  'Apple TV+': { name: 'Apple TV', url: 'https://tv.apple.com' },
  'OSN+':      { name: 'OSN+',     url: 'https://www.osnplus.com' },
  'OSN':       { name: 'OSN+',     url: 'https://www.osnplus.com' },
};

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const fetchAllLibraryIds = async () => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/library_shows?select=show_id`, { headers });
  const data = await res.json();
  return [...new Set((data || []).map(r => r.show_id))];
};

const fetchProviders = async (showId) => {
  try {
    const res = await fetch(`https://api.themoviedb.org/3/tv/${showId}/watch/providers?api_key=${TMDB_API_KEY}`);
    const data = await res.json();
    const entries = new Map();

    for (const region of REGIONS) {
      const regionData = data?.results?.[region];
      if (!regionData) continue;
      const providers = [
        ...(regionData.flatrate || []),
        ...(regionData.free || []),
        ...(regionData.ads || []),
      ];
      for (const p of providers) {
        const match = PLATFORM_WHITELIST[p.provider_name];
        if (match && !entries.has(match.name)) {
          entries.set(match.name, { show_id: showId, platform: match.name, url: match.url });
        }
      }
    }
    return [...entries.values()];
  } catch {
    return [];
  }
};

const upsert = async (rows) => {
  if (rows.length === 0) return;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/where_to_watch`, {
    method: 'POST',
    headers,
    body: JSON.stringify(rows),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error('Upsert error:', err);
  }
};

const run = async () => {
  console.log('Fetching library show IDs...');
  const allIds = await fetchAllLibraryIds();
  console.log(`Found ${allIds.length} shows. Fetching watch providers...\n`);

  const BATCH = 20;
  let totalAdded = 0;

  for (let i = 0; i < allIds.length; i += BATCH) {
    const batch = allIds.slice(i, i + BATCH);
    const results = await Promise.all(batch.map(fetchProviders));
    const rows = results.flat();

    if (rows.length > 0) {
      await upsert(rows);
      totalAdded += rows.length;
    }

    const progress = Math.min(i + BATCH, allIds.length);
    process.stdout.write(`\rProgress: ${progress}/${allIds.length} shows — ${totalAdded} platform entries added`);

    // Respect TMDB rate limit (~40 req/s) — 20 parallel calls, small pause between batches
    await sleep(600);
  }

  console.log(`\n\nDone! Added ${totalAdded} platform entries to where_to_watch.`);
};

run().catch(console.error);
