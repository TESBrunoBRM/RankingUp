const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function setup({ platform = 'android', granted = true } = {}) {
  const preferences = new Map();
  const scheduled = new Map();
  const calls = [];
  let activeUser = 'user-a';
  let permission = granted;
  let permissionRequests = 0;
  let failSchedule = false;
  const notifications = {
    IosAuthorizationStatus: { PROVISIONAL: 3 },
    AndroidImportance: { DEFAULT: 3 }, SchedulableTriggerInputTypes: { TIME_INTERVAL: 'timeInterval' },
    setNotificationHandler: () => {},
    setNotificationChannelAsync: async () => { calls.push('channel'); },
    getPermissionsAsync: async () => ({ granted: permission }),
    requestPermissionsAsync: async () => { calls.push('permission'); permissionRequests++; return { granted: permission }; },
    scheduleNotificationAsync: async request => { if (failSchedule) throw new Error('native scheduling failed'); scheduled.set(request.identifier, request); return request.identifier; },
    getAllScheduledNotificationsAsync: async () => [...scheduled.values()],
    cancelScheduledNotificationAsync: async id => { scheduled.delete(id); },
  };
  const mocks = {
    '@react-native-async-storage/async-storage': { getItem: async key => preferences.get(key) ?? null,
      setItem: async (key, value) => { preferences.set(key, value); }, removeItem: async key => { preferences.delete(key); } },
    'react-native': { Platform: { OS: platform } }, 'expo-notifications': notifications,
    '../store/authStore': { useAuthStore: { getState: () => ({ session: activeUser ? { user: { id: activeUser } } : null }) } },
  };
  const source = readFileSync(resolve(__dirname, '../src/services/weightReminder.ts'), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2021, esModuleInterop: true } }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, { exports, require: name => { if (!(name in mocks)) throw new Error(`Unexpected dependency ${name}`); return mocks[name]; } });
  return { api: exports, preferences, scheduled, calls, get permissionRequests() { return permissionRequests; },
    switchUser: value => { activeUser = value; }, deny: () => { permission = false; }, fail: () => { failSchedule = true; } };
}

test('does not request permission or schedule until explicitly enabled', async () => {
  const state = setup();
  assert.equal(await state.api.syncWeightReminder('user-a'), false);
  assert.equal(state.scheduled.size, 0); assert.equal(state.permissionRequests, 0);
});
test('creates exactly one weekly reminder per account and sync does not duplicate it', async () => {
  const state = setup();
  await state.api.setWeightReminder('user-a', true);
  await state.api.syncWeightReminder('user-a'); await state.api.syncWeightReminder('user-a');
  assert.equal(state.scheduled.size, 1);
  const request = [...state.scheduled.values()][0];
  assert.equal(request.trigger.seconds, 604800); assert.equal(request.trigger.repeats, true);
  assert.equal(request.content.data.userId, 'user-a');
});
test('creates Android channel before asking permission and does not enable after denial', async () => {
  const state = setup({ granted: false });
  await assert.rejects(state.api.setWeightReminder('user-a', true), /ajustes/);
  assert.ok(state.calls.indexOf('channel') < state.calls.indexOf('permission'));
  assert.equal(state.scheduled.size, 0); assert.equal(state.preferences.size, 0);
});
test('cancels on logout and restores opted-in reminders only for the returning account', async () => {
  const state = setup(); await state.api.setWeightReminder('user-a', true);
  state.switchUser(null); await state.api.syncWeightReminder(null);
  assert.equal(state.scheduled.size, 0); assert.equal(state.preferences.size, 1);
  state.switchUser('user-b'); await state.api.syncWeightReminder('user-b');
  assert.equal(state.scheduled.size, 0);
  state.switchUser('user-a'); await state.api.syncWeightReminder('user-a');
  assert.equal(state.scheduled.size, 1);
});
test('revoked permissions cancel pending reminders without prompting at startup', async () => {
  const state = setup(); await state.api.setWeightReminder('user-a', true); state.deny();
  assert.equal(await state.api.syncWeightReminder('user-a'), false);
  assert.equal(state.scheduled.size, 0); assert.equal(state.permissionRequests, 0);
});
test('disabling removes both the preference and the scheduled notification', async () => {
  const state = setup(); await state.api.setWeightReminder('user-a', true);
  await state.api.setWeightReminder('user-a', false); await state.api.syncWeightReminder('user-a');
  assert.equal(state.scheduled.size, 0); assert.equal(state.preferences.size, 0);
});
test('refuses a stale account operation and does not falsely enable when native scheduling fails', async () => {
  const state = setup();
  await assert.rejects(state.api.setWeightReminder('user-b', true), /sesión/);
  state.fail(); await assert.rejects(state.api.setWeightReminder('user-a', true), /native scheduling/);
  assert.equal(state.preferences.size, 0);
});
test('web sync remains harmless and enabling reports an unsupported platform', async () => {
  const state = setup({ platform: 'web' });
  assert.equal(await state.api.syncWeightReminder('user-a'), false);
  await assert.rejects(state.api.setWeightReminder('user-a', true), /Android e iOS/);
});
