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
    require: name => name === '../constants/exerciseAliases' ? aliases.exports : name.endsWith('exercise-guides.json')
      ? { default: require('../assets/data/exercise-guides.json') } : { rankingUpApiClient: client },
  });
  return module.exports.exerciseApi;
}
const detail = name => ({ name, bodyPartLabel: 'Espalda', targetLabel: 'Dorsales', equipmentLabel: 'Polea', muscleGroupLabel: 'Espalda', instructions: 'Instrucciones completas', gifUrl: 'https://example.test/demo.gif', thumbnailUrl: 'https://example.test/thumb.jpg', attribution: 'Titular de derechos' });

test('batch resolves Spanish aliases, preserves attribution and avoids extra individual requests', async () => {
  let individual = 0;
  const service = loadService({
    getExercisesByNames: async names => { assert.deepEqual([...names], ['Remo en polea sentado', 'cable seated row']); return [detail(names[1])]; },
    getExerciseByName: async () => { individual++; return null; },
  });
  await service.primeExercises(['Remo en polea sentado']);
  const exercise = await service.getExerciseByName('Remo en polea sentado');
  assert.equal(individual, 0);
  assert.equal(exercise.name, 'Remo en polea sentado');
  assert.equal(exercise.thumbnailUrl, 'https://example.test/thumb.jpg');
  assert.equal(exercise.attribution, 'Titular de derechos');
  assert.match(exercise.instructions, /Siéntate/);
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

test('every authored planner guide is immediately available offline, including no-equipment exercises', async () => {
  const service = loadService({ getExerciseByName: async () => { throw Error('offline'); } });
  const guides = require('../assets/data/exercise-guides.json');
  for (const guide of guides) {
    assert.equal(service.getOfflineExercise(guide.name).instructions, guide.instructions);
    assert.equal((await service.getExerciseByName(guide.name)).instructions, guide.instructions);
  }
  assert.equal(service.getOfflineExercise('Flexiones pica').equipment, 'Peso corporal');
  assert.equal(service.getOfflineExercise('Flexiones pica').gifUrl, undefined);
  assert.equal(service.getOfflineExercise('exercise that does not exist'), undefined);
});

test('an exact alias can supply an animation without replacing the original equipment or instructions', async () => {
  const service = loadService({ getExercisesByNames: async () => [
    { ...detail('Remo con mancuernas de pie'), gifUrl: null, thumbnailUrl: null },
    { ...detail('dumbbell bent over row'), instructions: 'Different catalog copy' },
  ] });
  await service.primeExercises(['Remo con mancuernas de pie']);
  const exercise = await service.getExerciseByName('Remo con mancuernas de pie');
  assert.match(exercise.instructions, /No necesitas banco/);
  assert.equal(exercise.equipment, 'Mancuernas');
  assert.equal(exercise.gifUrl, 'https://example.test/demo.gif');
  assert.equal(exercise.attribution, 'Titular de derechos');
});

test('large routines are batched within the server limit and keep original and alias together', async () => {
  const sizes = [];
  const service = loadService({ getExercisesByNames: async names => { sizes.push(names.length); return names.map(detail); } });
  await service.primeExercises(Array.from({ length: 60 }, (_, index) => `Custom ${index}`));
  assert.deepEqual(sizes, [25, 25, 10]);
});
