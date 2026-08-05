/**
 * Extract FILL/VOCAB/BOSS from game content.js into harvestShotDefaultContent.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const src = path.join(__dirname, '../../../frontend/public/games/harvest-shot/js/content.js');
const code = fs.readFileSync(src, 'utf8');
const sandbox = { window: undefined, globalThis: {}, console };
sandbox.globalThis = sandbox;
vm.runInNewContext(code, sandbox);
const HS = sandbox.HS_CONTENT || sandbox.globalThis.HS_CONTENT;
if (!HS) throw new Error('HS_CONTENT not found');
const pack = {
  fillStages: HS.FILL_STAGES,
  vocabStages: HS.VOCAB_STAGES,
  bossDefs: HS.BOSS_DEFS,
};
const outJs = path.join(__dirname, '../data/harvestShotDefaultContent.js');
fs.mkdirSync(path.dirname(outJs), { recursive: true });
fs.writeFileSync(
  outJs,
  `/** Default Harvest Shot lesson pack (from content.js). */\nmodule.exports = ${JSON.stringify(pack, null, 2)};\n`,
);
const outJson = path.join(__dirname, '../../../frontend/src/data/harvestShotDefaultContent.json');
fs.mkdirSync(path.dirname(outJson), { recursive: true });
fs.writeFileSync(outJson, JSON.stringify(pack, null, 2));
console.log('OK', pack.fillStages.length, pack.vocabStages.length, pack.bossDefs.length);
