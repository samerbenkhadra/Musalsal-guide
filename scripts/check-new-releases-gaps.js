const path = require('path');
const XLSX = require('xlsx');

const SUPABASE_URL = 'https://nkhhtznlasaqpatyzecp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5raGh0em5sYXNhcXBhdHl6ZWNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4NzMxNzEsImV4cCI6MjA5MDQ0OTE3MX0.C8DSixRp9eFVJq3U43f3VPg7RwraMDAFk4hLD20noKo';
const TMDB_KEY = 'df249df3a0df066640d620b5d876ef69';
const TMDB_BASE = 'https://api.themoviedb.org/3';

const sbHeaders = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
};
const sbWriteHeaders = { ...sbHeaders, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' };

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const sixMonthsAgo = new Date();
sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
const recentThreshold = sixMonthsAgo.toISOString().split('T')[0];

// Regions to check for watch providers (Middle East)
const WATCH_REGIONS = ['SA', 'AE', 'EG', 'QA', 'KW'];

// Map TMDB provider names to our platform format
const PROVIDER_MAP = {
  'shahid': { name: 'Shahid', url: 'https://shahid.mbc.net' },
  'netflix': { name: 'Netflix', url: 'https://www.netflix.com' },
  'osn+': { name: 'OSN+', url: 'https://www.osnplus.com' },
  'starzplay': { name: 'Starz Play', url: 'https://www.starzplay.com' },
  'starz play': { name: 'Starz Play', url: 'https://www.starzplay.com' },
  'weyyak': { name: 'Weyyak', url: 'https://weyyak.com' },
  'watch it': { name: 'Watch iT', url: 'https://watchit.ae' },
  'mbc': { name: 'MBC', url: 'https://www.mbc.net' },
  'apple tv+': { name: 'Apple TV', url: 'https://tv.apple.com' },
  'apple tv': { name: 'Apple TV', url: 'https://tv.apple.com' },
  'tod': { name: 'TOD', url: 'https://www.tod.tv' },
  'adtv': { name: 'AD TV', url: 'https://www.adtv.ae' },
  'yango play': { name: 'Yango Play', url: 'https://play.yango.com' },
  'viu': { name: 'Viu', url: 'https://www.viu.com' },
  'youtube': { name: 'YouTube', url: 'https://www.youtube.com' },
  'disney': { name: 'Disney+', url: 'https://www.disneyplus.com' },
  'disney+': { name: 'Disney+', url: 'https://www.disneyplus.com' },
  'amazon': { name: 'Amazon Prime', url: 'https://www.primevideo.com' },
  'prime': { name: 'Amazon Prime', url: 'https://www.primevideo.com' },
};

const resolveProvider = (name) => {
  const lower = name.toLowerCase().trim();
  for (const [key, val] of Object.entries(PROVIDER_MAP)) {
    if (lower.includes(key)) return val;
  }
  return null;
};

// ── Supabase helpers ──────────────────────────────────────────────────────────

const sbGet = async (endpoint) => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, { headers: sbHeaders });
  return res.json();
};

const sbUpsert = async (table, rows) => {
  if (!rows.length) return;
  await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: sbWriteHeaders,
    body: JSON.stringify(rows),
  });
};

// ── TMDB helpers ──────────────────────────────────────────────────────────────

const tmdbGet = (endpoint) =>
  fetch(`${TMDB_BASE}${endpoint}${endpoint.includes('?') ? '&' : '?'}api_key=${TMDB_KEY}&language=en-US`)
    .then(r => r.json()).catch(() => null);

const fetchTmdbPages = async (baseUrl, pages) => {
  const results = [];
  for (let page = 1; page <= pages; page++) {
    const data = await tmdbGet(`${baseUrl}&page=${page}`);
    if (data?.results) results.push(...data.results);
    await sleep(150);
  }
  return results;
};

const fetchDetails = async (ids, label) => {
  const results = [];
  const BATCH = 20;
  for (let i = 0; i < ids.length; i += BATCH) {
    const batch = ids.slice(i, i + BATCH);
    const fetched = await Promise.all(batch.map(id => tmdbGet(`/tv/${id}?`).catch(() => null)));
    fetched.forEach(s => { if (s && s.success !== false) results.push(s); });
    if (i + BATCH < ids.length) await sleep(200);
    process.stdout.write(`\r  [${label}] Fetched ${Math.min(i + BATCH, ids.length)}/${ids.length}...`);
  }
  process.stdout.write('\n');
  return results;
};

// Fetch TMDB watch providers for a list of show IDs, returns Map<id, [{name, url}]>
const fetchWatchProviders = async (ids, label) => {
  const providerMap = new Map();
  const BATCH = 20;
  for (let i = 0; i < ids.length; i += BATCH) {
    const batch = ids.slice(i, i + BATCH);
    const results = await Promise.all(
      batch.map(id => tmdbGet(`/tv/${id}/watch/providers?`).catch(() => null))
    );
    results.forEach((data, idx) => {
      if (!data?.results) return;
      const id = batch[idx];
      const seen = new Set();
      const platforms = [];
      for (const region of WATCH_REGIONS) {
        const regionData = data.results[region];
        if (!regionData) continue;
        const entries = [...(regionData.flatrate || []), ...(regionData.free || [])];
        for (const p of entries) {
          const resolved = resolveProvider(p.provider_name);
          if (resolved && !seen.has(resolved.name)) {
            seen.add(resolved.name);
            platforms.push(resolved);
          }
        }
      }
      if (platforms.length) providerMap.set(id, platforms);
    });
    if (i + BATCH < ids.length) await sleep(200);
    process.stdout.write(`\r  [${label}] Providers checked ${Math.min(i + BATCH, ids.length)}/${ids.length}...`);
  }
  process.stdout.write('\n');
  return providerMap;
};

// ── Main ──────────────────────────────────────────────────────────────────────

const run = async () => {
  // Fetch existing where_to_watch and blocked shows
  console.log('Fetching Supabase data...');
  const [watchRows, blockedRows] = await Promise.all([
    sbGet('where_to_watch?select=show_id&limit=5000'),
    sbGet('blocked_shows?select=show_id&limit=5000'),
  ]);
  const watchedIds = new Set(watchRows.map(r => r.show_id));
  const blockedIds = new Set(blockedRows.map(r => r.show_id));

  const allRows = [];
  const autoUploaded = [];

  const processShows = async (shows, section) => {
    // Filter blocked shows
    const active = shows.filter(s => !blockedIds.has(s.id));
    const missingWatch = active.filter(s => !watchedIds.has(s.id));
    const missingDesc = active.filter(s => !(s.overview || '').trim());

    // For shows missing where-to-watch, check TMDB providers
    if (missingWatch.length) {
      console.log(`  Checking TMDB watch providers for ${missingWatch.length} shows...`);
      const providerMap = await fetchWatchProviders(missingWatch.map(s => s.id), section);

      // Auto-upload providers found on TMDB
      const toUpload = [];
      for (const [showId, platforms] of providerMap.entries()) {
        for (const p of platforms) {
          toUpload.push({ show_id: showId, platform: p.name, url: p.url });
        }
        watchedIds.add(showId); // mark as handled
        autoUploaded.push({ section, id: showId, name: active.find(s => s.id === showId)?.name, platforms: platforms.map(p => p.name).join(', ') });
      }

      if (toUpload.length) {
        // Delete existing entries first, then insert
        const ids = [...new Set(toUpload.map(r => r.show_id))];
        for (let i = 0; i < ids.length; i += 100) {
          const chunk = ids.slice(i, i + 100);
          await fetch(`${SUPABASE_URL}/rest/v1/where_to_watch?show_id=in.(${chunk.join(',')})`, { method: 'DELETE', headers: sbWriteHeaders });
        }
        await sbUpsert('where_to_watch', toUpload);
        console.log(`  Auto-uploaded providers for ${ids.length} shows from TMDB`);
      }
    }

    // Add remaining gaps to sheet
    const stillMissingWatch = active.filter(s => !watchedIds.has(s.id));
    const stillMissingDesc = active.filter(s => !(s.overview || '').trim());
    const needsManual = new Set([...stillMissingWatch, ...stillMissingDesc].map(s => s.id));

    active.filter(s => needsManual.has(s.id)).forEach(s => {
      allRows.push({
        section,
        tmdbId: s.id,
        name: s.name,
        firstAirDate: s.first_air_date || '',
        missingWatch: !watchedIds.has(s.id),
        missingDesc: !(s.overview || '').trim(),
      });
    });
  };

  // ── New Releases ─────────────────────────────────────────────────────────────
  console.log('\n[New Releases] Fetching library shows...');
  const recentLib = await sbGet(`library_shows?first_air_date=gte.${recentThreshold}&select=show_id&limit=1000`);
  const recentIds = [...new Set(recentLib.map(r => r.show_id))];
  console.log(`  ${recentIds.length} shows found`);
  const recentDetails = await fetchDetails(recentIds, 'New Releases');
  await processShows(recentDetails, 'New Releases');

  // ── Golden Era ────────────────────────────────────────────────────────────────
  console.log('\n[Golden Era] Fetching from TMDB...');
  const classicParams = 'first_air_date.lte=1999-12-31&sort_by=vote_count.desc&without_genres=16';
  const tmdbClassics = await fetchTmdbPages(`/discover/tv?${classicParams}&with_original_language=ar`, 2);
  const tmdbClassicIds = new Set(tmdbClassics.map(s => s.id));
  const classicLib = await sbGet('library_shows?first_air_date=lt.2000-01-01&select=show_id&limit=1000');
  const libClassicIds = [...new Set(classicLib.map(r => r.show_id))].filter(id => !tmdbClassicIds.has(id));
  const libClassicDetails = await fetchDetails(libClassicIds, 'Golden Era lib');
  const allClassics = [...tmdbClassics.filter(s => s.poster_path), ...libClassicDetails.filter(s => s.poster_path)]
    .filter((s, i, a) => a.findIndex(x => x.id === s.id) === i);
  console.log(`  ${allClassics.length} total unique shows`);
  await processShows(allClassics, 'Golden Era');

  // ── Popular ───────────────────────────────────────────────────────────────────
  console.log('\n[Popular] Fetching from TMDB...');
  const popParams = 'sort_by=vote_count.desc&without_genres=16';
  const [arPop, trPop] = await Promise.all([
    fetchTmdbPages(`/discover/tv?${popParams}&with_original_language=ar`, 2),
    fetchTmdbPages(`/discover/tv?${popParams}&with_original_language=tr`, 2),
  ]);
  const popShows = [...arPop, ...trPop].filter((s, i, a) => a.findIndex(x => x.id === s.id) === i);
  console.log(`  ${popShows.length} unique shows from TMDB`);
  await processShows(popShows, 'Popular');

  // ── Write Excel ───────────────────────────────────────────────────────────────
  const xlsxPath = path.join(__dirname, 'shows_report.xlsx');
  const wb = XLSX.readFile(xlsxPath);
  const existingIdx = wb.SheetNames.indexOf('Content Gaps');
  if (existingIdx !== -1) { wb.SheetNames.splice(existingIdx, 1); delete wb.Sheets['Content Gaps']; }

  const sorted = allRows.sort(
    (a, b) => a.section.localeCompare(b.section) || (b.firstAirDate || '').localeCompare(a.firstAirDate || '')
  );
  const wsData = [
    ['Section', 'TMDB ID', 'Name', 'First Air Date', 'Missing Where-to-Watch', 'Missing Description', 'Where to Watch'],
    ...sorted.map(r => [r.section, r.tmdbId, r.name || '', r.firstAirDate, r.missingWatch ? 'YES' : '', r.missingDesc ? 'YES' : '', '']),
  ];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws['!cols'] = [{ wch: 14 }, { wch: 10 }, { wch: 40 }, { wch: 14 }, { wch: 22 }, { wch: 20 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, ws, 'Content Gaps');
  XLSX.writeFile(wb, xlsxPath);

  // ── Summary ───────────────────────────────────────────────────────────────────
  console.log(`\n── Auto-uploaded from TMDB providers: ${autoUploaded.length} shows ──`);
  autoUploaded.forEach(r => console.log(`  [${r.section}] ${r.name} → ${r.platforms}`));

  console.log('\n── Manual gaps remaining ──');
  for (const section of ['New Releases', 'Golden Era', 'Popular']) {
    const rows = allRows.filter(r => r.section === section);
    const mw = rows.filter(r => r.missingWatch).length;
    const md = rows.filter(r => r.missingDesc).length;
    console.log(`  [${section}]  Missing watch: ${mw}  |  Missing desc: ${md}`);
  }

  console.log(`\n"Content Gaps" tab updated in shows_report.xlsx`);
  console.log(`Fill in the "Where to Watch" column, then run: node scripts/upload-watch-data.js`);
};

run().catch(console.error);
