// Runs every suite in order and prints the summary. Usage: BASE_URL=https://example.com node run-all.js
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const dir = __dirname;
const suites = [['account.js', 'A-ZZ-CLEANUP'], ['demo.js'], ['account.js'], ['inventory.js']];
for (const [file, only] of suites) {
  console.log(`\n=== node ${file} ${only || ''}`);
  const r = spawnSync('node', [path.join(dir, file), ...(only ? [only] : [])], { stdio: 'inherit', env: process.env });
  if (r.status && file === 'inventory.js') console.log('inventory exited', r.status);
}
const sum = { pass: 0, fail: 0, failed: [] };
for (const f of ['demo', 'account']) {
  const p = path.join(dir, 'results', f + '.json'); if (!fs.existsSync(p)) continue;
  const rows = JSON.parse(fs.readFileSync(p)).results;
  const leaf = rows.filter(r => !rows.some(o => o.id.startsWith(r.id + '.')));
  for (const r of leaf) { if (r.status === 'pass') sum.pass++; else { sum.fail++; sum.failed.push(r.id + ' ' + r.title); } }
}
console.log(`\nTOTAL leaf tests: ${sum.pass + sum.fail}  passed: ${sum.pass}  failed: ${sum.fail}`);
sum.failed.forEach(x => console.log('  FAIL ' + x));
