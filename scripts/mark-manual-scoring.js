const XLSX = require('xlsx');
const path = require('path');

const MANUAL_SCORE_IDS = {
  Turkish: [82583,49513,67570,69786,70798,71096,73506,74457,74660,74823,75050,77551,78058,79026,80229,83028,83584,84575,88024,89172,89671,90210,90302,101385],
  Lebanese: [301229,229385],
  Syrian: [221737,227584,282693,283974,283975,314163,314369,314464],
  Gulf: [296671,299648,299984,300759,303119,303332,303608,303707,305738,305745,308328,308589,308595,308598,309540,309841,309846,310662,312145,313860,314079,314086,314087,314098,314101,314104,314109,314111,314112,314259,314323,314332,314344,314355,314369,314370,314373,314392,314451,314457,314480,314484,314493,314542,314547,314591,314683,314727,314759,314800,314817,315315,315454,318847,319562],
  Egyptian: [305687,314378,314472,317726,317747,317749,317750],
};

const filePath = path.join(__dirname, 'shows_report.xlsx');
const wb = XLSX.readFile(filePath);

for (const [region, ids] of Object.entries(MANUAL_SCORE_IDS)) {
  const ws = wb.Sheets[region];
  if (!ws) { console.log(`Sheet "${region}" not found, skipping.`); continue; }

  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
  if (rows.length === 0) continue;

  const headers = rows[0];
  let tmdbCol = headers.indexOf('TMDB ID');
  if (tmdbCol === -1) tmdbCol = headers.findIndex(h => h && h.toString().toLowerCase().includes('tmdb'));
  if (tmdbCol === -1) { console.log(`No TMDB ID column in ${region}`); continue; }

  let manualCol = headers.indexOf('Manual Score Needed');
  if (manualCol === -1) {
    manualCol = headers.length;
    rows[0].push('Manual Score Needed');
  }

  const idSet = new Set(ids.map(Number));
  for (let i = 1; i < rows.length; i++) {
    const id = Number(rows[i][tmdbCol]);
    rows[i][manualCol] = idSet.has(id) ? 'yes' : '';
  }

  const newWs = XLSX.utils.aoa_to_sheet(rows);
  wb.Sheets[region] = newWs;
  console.log(`Updated ${region}`);
}

XLSX.writeFile(wb, filePath);
console.log('Done. Manual Score Needed column added to your Excel.');
