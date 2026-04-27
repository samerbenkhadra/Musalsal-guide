const XLSX = require('xlsx');
const path = require('path');

const SUPABASE_URL = 'https://nkhhtznlasaqpatyzecp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5raGh0em5sYXNhcXBhdHl6ZWNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4NzMxNzEsImV4cCI6MjA5MDQ0OTE3MX0.C8DSixRp9eFVJq3U43f3VPg7RwraMDAFk4hLD20noKo';

const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'resolution=merge-duplicates',
};

const PLATFORM_MAP = {
  'shahid': { name: 'Shahid', url: 'https://shahid.mbc.net' },
  'netflix': { name: 'Netflix', url: 'https://www.netflix.com' },
  'osn': { name: 'OSN', url: 'https://www.osnplus.com' },
  'starz': { name: 'Starz Play', url: 'https://www.starzplay.com' },
  'weyyak': { name: 'Weyyak', url: 'https://weyyak.com' },
  'watchit': { name: 'Watch iT', url: 'https://watchit.ae' },
  'mbc': { name: 'MBC', url: 'https://www.mbc.net' },
  'youtube': { name: 'YouTube', url: 'https://www.youtube.com' },
  'apple': { name: 'Apple TV', url: 'https://tv.apple.com' },
  'appletv': { name: 'Apple TV', url: 'https://tv.apple.com' },
  'tod': { name: 'TOD', url: 'https://www.tod.tv' },
};

const resolveWatchEntry = (raw) => {
  if (!raw) return null;
  const trimmed = raw.toString().trim();
  const lower = trimmed.toLowerCase();

  // Check if it's a plain platform name
  for (const [key, val] of Object.entries(PLATFORM_MAP)) {
    if (lower === key || lower === val.name.toLowerCase()) {
      return { platform: val.name, url: val.url };
    }
  }

  // Check if it's a URL containing a known platform
  if (trimmed.startsWith('http')) {
    for (const [key, val] of Object.entries(PLATFORM_MAP)) {
      if (lower.includes(key)) {
        return { platform: val.name, url: trimmed };
      }
    }
    // Unknown URL — use domain as platform name
    try {
      const platform = new URL(trimmed).hostname.replace('www.', '');
      return { platform, url: trimmed };
    } catch {
      return null;
    }
  }

  return null;
};

const upsert = async (table, rows) => {
  if (rows.length === 0) return;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(rows),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error(`Error upserting ${table}:`, err);
  }
};

const run = async () => {
  const wb = XLSX.readFile(path.join(__dirname, 'shows_report.xlsx'));

  const blockedShows = [];
  const notBlockedIds = [];
  const whereToWatch = [];
  const scores = [];
  const titleOverrides = [];

  for (const sheetName of wb.SheetNames) {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName]);
    console.log(`Processing ${sheetName} (${rows.length} rows)...`);

    for (const row of rows) {
      const showId = Number(row['TMDB ID']);
      if (!showId) continue;

      // Blocked shows
      const removeVal = (row['Remove?'] || '').toString().toLowerCase().trim();
      if (removeVal === 'yes') {
        blockedShows.push({ show_id: showId });
      } else {
        notBlockedIds.push(showId);
      }

      // Where to watch
      const rawWatch = row['Where to Watch'] || row['Where to watch'] || row['Where to watch?'] || row['Where To Watch'] || '';
      if (rawWatch && rawWatch.toString().trim().length > 3) {
        const resolved = resolveWatchEntry(rawWatch.toString().trim());
        if (resolved) {
          whereToWatch.push({ show_id: showId, url: resolved.url, platform: resolved.platform });
        }
      }

      // Title override
      const titleEn = (row['Title (EN)'] || '').toString().trim();
      if (titleEn) titleOverrides.push({ show_id: showId, title_en: titleEn });

      // Scores
      const romance = row['Romance (0-100)'];
      const drama = row['Drama (0-100)'];
      const suspense = row['Suspense (0-100)'];
      const comedy = row['Comedy (0-100)'];

      if ([romance, drama, suspense, comedy].some(v => v !== '' && v !== undefined && v !== null)) {
        scores.push({
          show_id: showId,
          romance: Number(romance) || 0,
          drama: Number(drama) || 0,
          suspense: Number(suspense) || 0,
          comedy: Number(comedy) || 0,
        });
      }
    }
  }

  // Collect all valid show IDs as library with region
  const libraryShows = [];
  for (const sheetName of wb.SheetNames) {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName]);
    for (const row of rows) {
      const showId = Number(row['TMDB ID']);
      const dubbedVal = (row['Dubbed in Arabic?'] || '').toString().toLowerCase().trim();
      if (showId) libraryShows.push({ show_id: showId, region: sheetName, dubbed: dubbedVal === 'yes' });
    }
  }

  // Remove shows that are no longer marked as blocked
  if (notBlockedIds.length > 0) {
    const chunkSize = 100;
    for (let i = 0; i < notBlockedIds.length; i += chunkSize) {
      const chunk = notBlockedIds.slice(i, i + chunkSize);
      await fetch(`${SUPABASE_URL}/rest/v1/blocked_shows?show_id=in.(${chunk.join(',')})`, {
        method: 'DELETE',
        headers,
      });
    }
  }

  const uniqueBlockedShows = [...new Map(blockedShows.map(r => [r.show_id, r])).values()];
  const uniqueScores = [...new Map(scores.map(r => [r.show_id, r])).values()];
  const uniqueWhereToWatch = [...new Map(whereToWatch.map(r => [r.show_id, r])).values()];
  const uniqueTitleOverrides = [...new Map(titleOverrides.map(r => [r.show_id, r])).values()];

  console.log(`\nUploading ${uniqueBlockedShows.length} blocked shows...`);
  await upsert('blocked_shows', uniqueBlockedShows);

  console.log(`Uploading ${uniqueWhereToWatch.length} where to watch entries...`);
  await upsert('where_to_watch', uniqueWhereToWatch);

  console.log(`Uploading ${uniqueScores.length} score entries...`);
  await upsert('show_scores', uniqueScores);

  const uniqueLibraryShows = [...new Map(libraryShows.map(r => [`${r.show_id}_${r.region}`, r])).values()];
  console.log(`Uploading ${uniqueLibraryShows.length} library shows...`);
  await upsert('library_shows', uniqueLibraryShows);

  console.log(`Uploading ${uniqueTitleOverrides.length} title overrides...`);
  await upsert('title_overrides', uniqueTitleOverrides);

  console.log('\nDone!');
  console.log(`  Blocked: ${blockedShows.length}`);
  console.log(`  Where to watch: ${whereToWatch.length}`);
  console.log(`  Scores: ${scores.length}`);
  console.log(`  Library: ${libraryShows.length}`);
  console.log(`  Title overrides: ${titleOverrides.length}`);
};

run().catch(console.error);
