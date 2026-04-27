const TMDB_API_KEY = 'df249df3a0df066640d620b5d876ef69';
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY || process.argv[2];
const SUPABASE_URL = 'https://nkhhtznlasaqpatyzecp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5raGh0em5sYXNhcXBhdHl6ZWNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4NzMxNzEsImV4cCI6MjA5MDQ0OTE3MX0.C8DSixRp9eFVJq3U43f3VPg7RwraMDAFk4hLD20noKo';

const MISSING_IDS = [52698,84774,73782,110477,86325,90674,52560,104395,306215,302658,300388,302063,298629,271548,256400,271014,259812,251883,244842,240798,242073,241020,238711,214081,231100,231503,224344,224054,219446,219826,219290,212818,213194,209793,210865,209032,206180,205593,203572,202010,197188,158809,49608,153515,136506,136125,137713,133490,133020,131906,126255,125527,123138,123725,121435,122186,119806,119267,115970,115678,115464,112745,109905,103357,100868,50532,108179,104877,104690,115641,100897,99616,97852,97482,95603,49513,92967,90302,89671,90210,101385,88024,7723,79026,84575,83584,83087,82369,80229,78058,52645,77994,77551,75365,89172,77532,74660,74823,74457,73933,73506,83028,71096,71036,71591,70798,69786,69540,69535,69459,67570,75050,66047,69306,60930,65555,73766,49347,34899,34587,82583,308689,287328,279556,251109,242570,221355,211782,130438,121745,99851,93411,89126,86962,227791,13921,304620,261033,227577,93372,93719,296332,157934,84781,201150,93750,115057,116528,53923,229385,93572,95093,314109,218739,218324,158650,139471,122543,102045,94047,98632,75165,72048,84333,82313,66193,96202,260606,260605,271790,246244,224882,244644,250910,204235,296218,122665,296791,318188,319937,314162,314547,284483,248668,251691,256682,196231,201575,131046,128240,123153,157382,95133,71926,231346,261840,231660,201154,231158,248848,248851,234931,201143,249209,57402];

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const fetchShow = async (id) => {
  const res = await fetch(`https://api.themoviedb.org/3/tv/${id}?api_key=${TMDB_API_KEY}`);
  return await res.json();
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
  const res = await fetch(`${SUPABASE_URL}/rest/v1/show_scores`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify({ show_id: showId, romance: 0, drama: 0, suspense: 0, comedy: 0, ...scores }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Supabase error: ${err}`);
  }
};

const run = async () => {
  if (!CLAUDE_API_KEY) { console.error('ERROR: No Claude API key provided. Run: node scripts/prewarm-missing.js YOUR_KEY'); process.exit(1); }
  console.log(`Scoring ${MISSING_IDS.length} missing shows...\n`);
  let done = 0;
  const batchSize = 5;

  for (let i = 0; i < MISSING_IDS.length; i += batchSize) {
    const batch = MISSING_IDS.slice(i, i + batchSize);
    await Promise.all(batch.map(async (id) => {
      try {
        const show = await fetchShow(id);
        if (!show || !show.name) { console.log(`[${++done}/${MISSING_IDS.length}] ✗ ${id} — not found`); return; }
        const scores = await scoreShow(show);
        await saveScore(id, scores);
        console.log(`[${++done}/${MISSING_IDS.length}] ✓ ${show.name}`);
      } catch (e) {
        console.log(`[${++done}/${MISSING_IDS.length}] ✗ ${id} — ${e.message}`);
      }
    }));
    if (i + batchSize < MISSING_IDS.length) await sleep(300);
  }

  console.log(`\nDone.`);
};

run().catch(console.error);
