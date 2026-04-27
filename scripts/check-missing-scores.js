const SUPABASE_URL = 'https://nkhhtznlasaqpatyzecp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5raGh0em5sYXNhcXBhdHl6ZWNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4NzMxNzEsImV4cCI6MjA5MDQ0OTE3MX0.C8DSixRp9eFVJq3U43f3VPg7RwraMDAFk4hLD20noKo';

const headers = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` };

const fetchAll = async (table) => {
  const results = [];
  let offset = 0;
  const pageSize = 1000;
  while (true) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/${table}?select=show_id&limit=${pageSize}&offset=${offset}`,
      { headers: { ...headers, Range: `${offset}-${offset + pageSize - 1}`, 'Range-Unit': 'items' } }
    );
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) break;
    results.push(...data);
    if (data.length < pageSize) break;
    offset += pageSize;
  }
  return results;
};

const run = async () => {
  const [libraryData, scoresData] = await Promise.all([
    fetchAll('library_shows'),
    fetchAll('show_scores'),
  ]);

  const libraryIds = new Set((libraryData || []).map(r => Number(r.show_id)));
  const scoredIds = new Set((scoresData || []).map(r => Number(r.show_id)));

  const missing = [...libraryIds].filter(id => !scoredIds.has(id));

  console.log(`Library shows: ${libraryIds.size}`);
  console.log(`Scored shows: ${scoredIds.size}`);
  console.log(`Missing scores: ${missing.length}`);
  if (missing.length > 0) console.log(`\nMissing IDs:\n${missing.join(', ')}`);
};

run().catch(console.error);
