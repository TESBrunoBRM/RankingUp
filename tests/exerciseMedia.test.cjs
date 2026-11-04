const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');

function loadService(client) {
  const aliases = { exports: {} };
  const compile = file => ts.transpileModule(readFileSync(path.join(__dirname, '..', file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2021 } }).outputText;
  vm.runInNewContext(compile('src/constants/exerciseAliases.ts'), { exports: aliases.exports });
  const module = { exports: {} };
  vm.runInNewContext(compile('src/services/exerciseApi.ts'), {
    exports: module.exports,
    require: name => name === '../constants/exerciseAliases' ? aliases.exports : { rankingUpApiClient: client },
  });
  return module.exports.exerciseApi;
}
const detail = name => ({ name, bodyPartLabel: 'Espalda', targetLabel: 'Dorsales', equipmentLabel: 'Polea', muscleGroupLabel: 'Espalda', instructions: 'Instrucciones completas', gifUrl: 'https://example.test/demo.gif', thumbnailUrl: 'https://example.test/thumb.jpg', attribution: 'Titular de derechos' });

test('batch resolves Spanish aliases, preserves attribution and avoids extra individual requests', async () => {
  let individual = 0;
  const service = loadService({
    getExercisesByNames: async names => { assert.deepEqual([...names], ['cable seated row']); return [detail(names[0])]; },
    getExerciseByName: async () => { individual++; return null; },
  });
  await service.primeExercises(['Remo en polea sentado']);
  const exercise = await service.getExerciseByName('Remo en polea sentado');
  assert.equal(individual, 0);
  assert.equal(exercise.name, 'Remo en polea sentado');
  assert.equal(exercise.thumbnailUrl, 'https://example.test/thumb.jpg');
  assert.equal(exercise.attribution, 'Titular de derechos');
});
test('missing results and network failures can recover on a later request', async () => {
  let requests = 0;
  const service = loadService({ getExerciseByName: async name => { requests++; if (requests === 1) throw Error('offline'); if (requests === 2) return null; return detail(name); } });
  assert.equal(await service.getExerciseByName('custom movement'), undefined);
  assert.equal(await service.getExerciseByName('custom movement'), undefined);
  assert.ok((await service.getExerciseByName('custom movement')).gifUrl);
  assert.equal(requests, 3);
});
test('offline fallback never assigns a partial-name movement to a different exercise', async () => {
  const service = loadService({ getExerciseByName: async () => { throw Error('offline'); } });
  assert.equal(await service.getExerciseByName('Press'), undefined);
  assert.equal(await service.getExerciseByName('Banca'), undefined);
  assert.equal((await service.getExerciseByName('Press de Banca')).name, 'Press de Banca');
});
