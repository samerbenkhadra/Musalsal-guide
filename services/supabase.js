const SUPABASE_URL = 'https://nkhhtznlasaqpatyzecp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5raGh0em5sYXNhcXBhdHl6ZWNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4NzMxNzEsImV4cCI6MjA5MDQ0OTE3MX0.C8DSixRp9eFVJq3U43f3VPg7RwraMDAFk4hLD20noKo';

export const fetchActorNameOverrides = async () => {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/actor_names?select=tmdb_id,name_ar`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      }
    );
    const data = await res.json();
    return Object.fromEntries((data || []).map((r) => [r.tmdb_id, r.name_ar]));
  } catch {
    return {};
  }
};

export const fetchHighlight = async () => {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/highlight?select=*&limit=1`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      }
    );
    const data = await response.json();
    console.log('Highlight data:', JSON.stringify(data));
    return data[0] || null;
  } catch (error) {
    console.log('Highlight error:', error.message);
    return null;
  }
};
