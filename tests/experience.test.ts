import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { EXPERIENCE_VERSION, hasCurrentExperience, type ExperiencePreferences } from '../src/constants/experience.ts';
import { meetsPasswordRequirements } from '../src/utils/password.ts';

test('new and outdated accounts must complete the current guide', () => {
  const current: ExperiencePreferences = { features: ['training'], safetyVersion: EXPERIENCE_VERSION, acknowledgedAt: 'now', guideCompletedAt: 'now' };
  assert.equal(hasCurrentExperience(null), false);
  assert.equal(hasCurrentExperience({ ...current, features: [] }), false);
  assert.equal(hasCurrentExperience({ ...current, safetyVersion: 'old' }), false);
  assert.equal(hasCurrentExperience({ ...current, guideCompletedAt: '' }), false);
  assert.equal(hasCurrentExperience({ ...current, acknowledgedAt: '' }), false);
  assert.equal(hasCurrentExperience(current), true);
  assert.deepEqual(current.features, ['training']);
});

test('client and server require the same terms and guide versions', () => {
  const legalClient = readFileSync(new URL('../src/constants/legal.ts', import.meta.url), 'utf8');
  const legalServer = readFileSync(new URL('../apps/api/src/legal/accept-legal.dto.ts', import.meta.url), 'utf8');
  const experienceServer = readFileSync(new URL('../apps/api/src/experience/experience.dto.ts', import.meta.url), 'utf8');
  assert.equal(legalClient.match(/LEGAL_VERSION = '([^']+)'/)?.[1], legalServer.match(/DOCUMENT_VERSION = '([^']+)'/)?.[1]);
  assert.equal(EXPERIENCE_VERSION, experienceServer.match(/EXPERIENCE_VERSION = '([^']+)'/)?.[1]);
});

test('password minimum accepts the boundary and keeps literal characters', () => {
  assert.equal(meetsPasswordRequirements(''), false);
  assert.equal(meetsPasswordRequirements('1234567'), false);
  assert.equal(meetsPasswordRequirements('12345678'), true);
  assert.equal(meetsPasswordRequirements(' una frase larga '), true);
});
