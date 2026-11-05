// The API's authored catalog is the single source for the mobile offline guide.
// Run after editing exercise-catalog.ts; --check verifies the bundled snapshot.
const { readFileSync, writeFileSync, mkdirSync } = require('node:fs');
const { resolve } = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = resolve(__dirname, '..');
const moduleExports = {};
const code = ts.transpileModule(readFileSync(resolve(root, 'apps/api/src/domain/exercise-catalog.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2021 },
}).outputText;
vm.runInNewContext(code, { exports: moduleExports, require: () => ({ normalizeLabel: value => value }) });
const snapshot = `${JSON.stringify(moduleExports.FEATURED_EXERCISES, null, 2)}\n`;
const output = resolve(root, 'assets/data/exercise-guides.json');
if (process.argv.includes('--check')) {
  if (readFileSync(output, 'utf8') !== snapshot) throw Error('Run node scripts/sync-exercise-guides.cjs');
} else {
  mkdirSync(resolve(root, 'assets/data'), { recursive: true });
  writeFileSync(output, snapshot);
}
console.log(`Verified ${moduleExports.FEATURED_EXERCISES.length} offline exercise guides.`);
