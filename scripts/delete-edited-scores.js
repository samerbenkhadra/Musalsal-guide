const XLSX = require('xlsx');
const path = require('path');

const SUPABASE_URL = 'https://nkhhtznlasaqpatyzecp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5raGh0em5sYXNhcXBhdHl6ZWNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4NzMxNzEsImV4cCI6MjA5MDQ0OTE3MX0.C8DSixRp9eFVJq3U43f3VPg7RwraMDAFk4hLD20noKo';

const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
};

const run = async () => {
  const wb = XLSX.readFile(path.join(__dirname, 'shows_report.xlsx'));

  const ids = [];
  for (const sheetName of wb.SheetNames) {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName]);
    for (const row of rows) {
      const showId = Number(row['TMDB ID']);
      const edited = (row['Added/edited description?'] || '').toString().toLowerCase().trim();
      if (showId && edited === 'yes') ids.push(showId);
    }
  }

  const unique = [...new Set(ids)];
  if (unique.length === 0) {
    console.log('No shows marked as edited. Nothing to delete.');
    return;
  }

  console.log(`Deleting scores for ${unique.length} shows...`);
  const chunkSize = 100;
  for (let i = 0; i < unique.length; i += chunkSize) {
    const chunk = unique.slice(i, i + chunkSize);
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/show_scores?show_id=in.(${chunk.join(',')})`,
      { method: 'DELETE', headers }
    );
    if (!res.ok) {
      const err = await res.text();
      console.error('Delete error:', err);
    }
  }

  console.log(`Done. ${unique.length} scores deleted. Run prewarm next.`);
};

run().catch(console.error);
