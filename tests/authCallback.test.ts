import assert from 'node:assert/strict';
import test from 'node:test';
import { AUTH_CALLBACK_URL, parseAuthCallback } from '../src/utils/authCallback.ts';
import { getAuthErrorMessage, isEmailNotConfirmed } from '../src/utils/errors.ts';

test('only accepts the RankingUp auth callback', () => {
  assert.equal(AUTH_CALLBACK_URL, 'rankingup://auth/callback');
  assert.equal(parseAuthCallback('https://example.com/#access_token=secret&refresh_token=secret'), null);
  assert.equal(parseAuthCallback('rankingup://other/callback#access_token=secret'), null);
  assert.equal(parseAuthCallback('not a url'), null);
});

test('parses confirmation tokens from the URL fragment', () => {
  assert.deepEqual(parseAuthCallback(`${AUTH_CALLBACK_URL}#access_token=access%2Bvalue&refresh_token=refresh%2Fvalue&type=signup`), {
    kind: 'tokens', accessToken: 'access+value', refreshToken: 'refresh/value',
  });
});

test('parses a PKCE callback code', () => {
  assert.deepEqual(parseAuthCallback(`${AUTH_CALLBACK_URL}?code=abc123`), { kind: 'code', code: 'abc123' });
});

test('surfaces expired and incomplete links without authenticating', () => {
  assert.deepEqual(parseAuthCallback(`${AUTH_CALLBACK_URL}?error_code=otp_expired`), { kind: 'error', code: 'otp_expired' });
  assert.deepEqual(parseAuthCallback(AUTH_CALLBACK_URL), { kind: 'error', code: 'missing_credentials' });
});

test('gives actionable messages for email delivery and pending verification', () => {
  assert.match(getAuthErrorMessage({ code: 'email_address_not_authorized' }, 'fallback'), /SMTP/);
  const unconfirmed = { code: 'email_not_confirmed' };
  assert.equal(isEmailNotConfirmed(unconfirmed), true);
  assert.match(getAuthErrorMessage(unconfirmed, 'fallback'), /Confirma tu correo/);
});
