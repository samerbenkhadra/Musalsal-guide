const SUPABASE_URL = 'https://nkhhtznlasaqpatyzecp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5raGh0em5sYXNhcXBhdHl6ZWNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4NzMxNzEsImV4cCI6MjA5MDQ0OTE3MX0.C8DSixRp9eFVJq3U43f3VPg7RwraMDAFk4hLD20noKo';

export const callClaude = async (prompt) => {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/claude-proxy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
      body: JSON.stringify({ prompt }),
    });
    const data = await res.json();
    return data.text || '';
  } catch {
    return '';
  }
};

export const fetchShowScore = async (showId) => {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/show_scores?show_id=eq.${showId}&select=romance,drama,suspense,comedy`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      }
    );
    const data = await res.json();
    return data?.[0] || null;
  } catch {
    return null;
  }
};

export const saveShowScore = async (showId, scores) => {
  try {
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
  } catch {}
};

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

export const fetchLibraryShowIds = async () => {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/library_shows?select=show_id&limit=5000`,
      { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
    );
    const data = await res.json();
    return new Set((data || []).map(r => r.show_id));
  } catch {
    return new Set();
  }
};

export const fetchDubbedShowIds = async (region) => {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/library_shows?region=eq.${encodeURIComponent(region)}&dubbed=eq.true&select=show_id&limit=5000`,
      { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
    );
    const data = await res.json();
    return new Set((data || []).map(r => r.show_id));
  } catch {
    return new Set();
  }
};

export const fetchLibraryShowIdsByRegion = async (region) => {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/library_shows?region=eq.${encodeURIComponent(region)}&select=show_id&limit=5000`,
      { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
    );
    const data = await res.json();
    return (data || []).map(r => r.show_id);
  } catch {
    return [];
  }
};

export const fetchBlockedShows = async () => {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/blocked_shows?select=show_id`,
      { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
    );
    const data = await res.json();
    return new Set((data || []).map(r => r.show_id));
  } catch {
    return new Set();
  }
};

export const fetchWhereToWatch = async (showId) => {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/where_to_watch?show_id=eq.${showId}&select=url,platform`,
      { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
    );
    const data = await res.json();
    return data?.length > 0 ? data : null;
  } catch {
    return null;
  }
};

export const fetchTitleOverrides = async () => {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/title_overrides?select=show_id,title_en&limit=5000`,
      { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
    );
    const data = await res.json();
    return Object.fromEntries((data || []).map(r => [r.show_id, r.title_en]));
  } catch {
    return {};
  }
};

export const fetchTitleOverride = async (showId) => {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/title_overrides?show_id=eq.${showId}&select=title_en&limit=1`,
      { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
    );
    const data = await res.json();
    return data?.[0]?.title_en || null;
  } catch {
    return null;
  }
};

export const fetchScoredShowsForChat = async () => {
  try {
    const [overridesRes, scoresRes, libraryRes] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/title_overrides?select=show_id,title_en&limit=5000`, { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }),
      fetch(`${SUPABASE_URL}/rest/v1/show_scores?select=show_id,romance,drama,suspense,comedy&limit=5000`, { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }),
      fetch(`${SUPABASE_URL}/rest/v1/library_shows?select=show_id,region&limit=5000`, { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }),
    ]);
    const [overrides, scores, library] = await Promise.all([overridesRes.json(), scoresRes.json(), libraryRes.json()]);
    const overrideMap = Object.fromEntries((overrides || []).map(r => [r.show_id, r.title_en]));
    const scoreMap = Object.fromEntries((scores || []).map(r => [r.show_id, r]));
    const regionMap = {};
    (library || []).forEach(r => { if (!regionMap[r.show_id]) regionMap[r.show_id] = r.region; });
    return Object.keys(scoreMap)
      .filter(id => regionMap[id] && (scoreMap[id].romance + scoreMap[id].drama + scoreMap[id].suspense + scoreMap[id].comedy) > 0)
      .map(id => ({
        id: Number(id),
        name: overrideMap[id] || '',
        region: regionMap[id],
        romance: scoreMap[id].romance,
        drama: scoreMap[id].drama,
        suspense: scoreMap[id].suspense,
        comedy: scoreMap[id].comedy,
      }));
  } catch { return []; }
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
