require("dotenv").config();
const XLSX = require('xlsx');
const path = require('path');
const SUPABASE_URL = 'https://nkhhtznlasaqpatyzecp.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

const IDS = [314464,314369,314163,283974,283975,282693,221737,301229,227584,314759,314817,314542,314484,314472,314392,314370,314111,312515,308589,305745,285815,318847,299648,314355,315300,314591,314727,314800,314480,314451,314473,314683,314493,314479,314457,314332,314259,320516,314373,314323,314112,314098,314101,314104,312145,312517,313860,314344,308167,309540,308328,308598,308595,305738,303332,303119,303608,303707,299984,298839,296671,294379,82583,317750,317749,317726,317747,314378,314109,229385,157382,315315,314087,309846,314079,309841,315454,314086,310662,300759,313945,305687,314547,319562,279556,211782,242570,130438,221355,86962,89126,93411,93372,116528,284483,314162,248668,256682,128240,196231,201575,89671,90210,49513,89172,73506,67570,84575,101385,78058,83584,77551,74457,83028,69786,70798,75050,65555,319937,296218,286621,285570,285565,285485,292271,88024,71591,69459,53923,93750,224882,261840,248848,201154,234931,249209,73933,83087,75365,69306,66047,250910,246244,123153,95133,71926,231660,57402,201143,287328,308689,227791,304620,227577,13921,84781,296332,93719,157934,218739,218324,95093,102045,139471,94047,122543,82313,98632,72048,75165,260605,66193,96202,271790,90302,79026,80229,52645,74823,74660,71096,244644,318188,296791,69540,34899,49347,34587];

const headers = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` };

const run = async () => {
  const chunkSize = 100;
  const results = {};

  for (let i = 0; i < IDS.length; i += chunkSize) {
    const chunk = IDS.slice(i, i + chunkSize);
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/library_shows?show_id=in.(${chunk.join(',')})&select=show_id,region`,
      { headers }
    );
    const data = await res.json();
    for (const row of (data || [])) {
      if (!results[row.region]) results[row.region] = [];
      if (!results[row.region].includes(row.show_id)) results[row.region].push(row.show_id);
    }
  }

  const rows = [];
  for (const [region, ids] of Object.entries(results)) {
    for (const id of ids) rows.push({ 'Show ID': id, 'Region': region });
  }

  const allFound = Object.values(results).flat();
  const notFound = IDS.filter(id => !allFound.includes(id));
  for (const id of notFound) rows.push({ 'Show ID': id, 'Region': 'Not in library' });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [{ wch: 12 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, ws, 'Show Regions');
  const outputPath = path.join(__dirname, 'show_regions.xlsx');
  XLSX.writeFile(wb, outputPath);
  console.log(`Exported to ${outputPath}`);
};

run().catch(console.error);
