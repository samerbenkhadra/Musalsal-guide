// Reads content-gaps.xlsx, uploads any filled "Where to Watch" entries to Supabase.
// Workflow: run check-new-releases-gaps.js → fill column → run this script.

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
  'osn': { name: 'OSN+', url: 'https://www.osnplus.com' },
  'osn+': { name: 'OSN+', url: 'https://www.osnplus.com' },
  'starz': { name: 'Starz Play', url: 'https://www.starzplay.com' },
  'starzplay': { name: 'Starz Play', url: 'https://www.starzplay.com' },
  'weyyak': { name: 'Weyyak', url: 'https://weyyak.com' },
  'watchit': { name: 'Watch iT', url: 'https://watchit.ae' },
  'watch it': { name: 'Watch iT', url: 'https://watchit.ae' },
  'mbc': { name: 'MBC', url: 'https://www.mbc.net' },
  'youtube': { name: 'YouTube', url: 'https://www.youtube.com' },
  'apple': { name: 'Apple TV', url: 'https://tv.apple.com' },
  'appletv': { name: 'Apple TV', url: 'https://tv.apple.com' },
  'tod': { name: 'TOD', url: 'https://www.tod.tv' },
  'adtv': { name: 'AD TV', url: 'https://www.adtv.ae' },
  'ad tv': { name: 'AD TV', url: 'https://www.adtv.ae' },
  'yango': { name: 'Yango Play', url: 'https://play.yango.com' },
  'yango play': { name: 'Yango Play', url: 'https://play.yango.com' },
  'viu': { name: 'Viu', url: 'https://www.viu.com' },
  'disney': { name: 'Disney+', url: 'https://www.disneyplus.com' },
  'disney+': { name: 'Disney+', url: 'https://www.disneyplus.com' },
  'amazon': { name: 'Amazon Prime', url: 'https://www.primevideo.com' },
  'prime': { name: 'Amazon Prime', url: 'https://www.primevideo.com' },
};

const resolveWatchEntry = (raw) => {
  if (!raw) return null;
  const trimmed = raw.toString().trim();
  const lower = trimmed.toLowerCase();
  for (const [key, val] of Object.entries(PLATFORM_MAP)) {
    if (lower === key || lower === val.name.toLowerCase()) return { platform: val.name, url: val.url };
  }
  if (trimmed.startsWith('http')) {
    for (const [key, val] of Object.entries(PLATFORM_MAP)) {
      if (lower.includes(key)) return { platform: val.name, url: trimmed };
    }
    try {
      const platform = new URL(trimmed).hostname.replace('www.', '');
      return { platform, url: trimmed };
    } catch { return null; }
  }
  return null;
};

const run = async () => {
  const filePath = path.join(__dirname, 'shows_report.xlsx');
  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets['Content Gaps'];
  if (!ws) { console.log('No "Content Gaps" tab found in shows_report.xlsx. Run check-new-releases-gaps.js first.'); return; }
  const rows = XLSX.utils.sheet_to_json(ws);

  const whereToWatch = [];
  let skipped = 0;

  for (const row of rows) {
    const showId = Number(row['TMDB ID']);
    const rawWatch = (row['Where to Watch'] || '').toString().trim();
    if (!showId || !rawWatch) { skipped++; continue; }

    const entries = rawWatch.split(',').map(s => s.trim()).filter(Boolean);
    for (const entry of entries) {
      const resolved = resolveWatchEntry(entry);
      if (resolved) {
        whereToWatch.push({ show_id: showId, url: resolved.url, platform: resolved.platform });
      } else {
        console.warn(`  Unrecognised platform: "${entry}" (show ${showId})`);
      }
    }
  }

  const unique = [...new Map(whereToWatch.map(r => [`${r.show_id}_${r.platform}`, r])).values()];
  const showIds = [...new Set(unique.map(r => r.show_id))];

  if (showIds.length === 0) {
    console.log('No "Where to Watch" entries found in content-gaps.xlsx. Nothing uploaded.');
    return;
  }

  console.log(`Found ${unique.length} entries across ${showIds.length} shows. Uploading...`);

  // Delete existing entries for these shows first, then re-insert
  const chunkSize = 100;
  for (let i = 0; i < showIds.length; i += chunkSize) {
    const chunk = showIds.slice(i, i + chunkSize);
    await fetch(`${SUPABASE_URL}/rest/v1/where_to_watch?show_id=in.(${chunk.join(',')})`, {
      method: 'DELETE',
      headers,
    });
  }

  const res = await fetch(`${SUPABASE_URL}/rest/v1/where_to_watch`, {
    method: 'POST',
    headers,
    body: JSON.stringify(unique),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('Upload failed:', err);
    return;
  }

  console.log(`Done! Uploaded ${unique.length} where-to-watch entries for ${showIds.length} shows.`);
  console.log(`Skipped ${skipped} rows with no "Where to Watch" value.`);
};

run().catch(console.error);
