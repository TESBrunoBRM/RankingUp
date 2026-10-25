import { ConfigService } from '@nestjs/config';
import { generateKeyPairSync, sign } from 'node:crypto';
import { BillingService } from './billing.service';
import { AdmobVerifierService } from './admob-verifier.service';

describe('AdMob server-verified credits', () => {
  const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const user = '11111111-1111-4111-8111-111111111111';
  const challenge = '22222222-2222-4222-8222-222222222222';
  const rpc = jest.fn();
  let verifier: AdmobVerifierService;
  let fetchMock: jest.SpyInstance;
  beforeEach(() => {
    rpc.mockReset().mockResolvedValue(true);
    verifier = new AdmobVerifierService(
      new ConfigService({ ADMOB_REWARDED_AD_UNIT: 'ca-app-pub-123/456' }),
      { mode: 'test', rpc } as unknown as BillingService,
    );
    fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue({
        ok: true,
        json: async () => ({
          keys: [{ keyId: 7, pem: publicKey.export({ type: 'spki', format: 'pem' }) }],
        }),
      } as Response);
  });
  afterEach(() => jest.restoreAllMocks());
  const signedUrl = (overrides: Record<string, string> = {}) => {
    const query = new URLSearchParams({
      ad_unit: '456',
      reward_amount: '1',
      reward_item: 'ai_use',
      timestamp: Date.now().toString(),
      transaction_id: 'transaction-123',
      user_id: user,
      custom_data: challenge,
      ...overrides,
    }).toString();
    return `/v1/billing/callbacks/admob?${query}&signature=${sign('sha256', Buffer.from(query), privateKey).toString('base64url')}&key_id=7`;
  };
  it('grants one credit only after a valid Google-key signature', async () => {
    await verifier.reward(signedUrl());
    expect(rpc).toHaveBeenCalledWith('billing_reward_credit', {
      p_user_id: user,
      p_challenge: challenge,
      p_transaction: 'transaction-123',
      p_environment: 'test',
    });
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://www.gstatic.com/admob/reward/verifier-keys.json',
    );
  });
  it('rejects a modified signed payload', async () => {
    await expect(
      verifier.reward(signedUrl().replace('reward_amount=1', 'reward_amount=2')),
    ).rejects.toThrow();
    expect(rpc).not.toHaveBeenCalled();
  });
  it.each<Record<string, string>>([
    { ad_unit: '999' },
    { reward_amount: '99' },
    { user_id: 'bad-user' },
    { timestamp: '1' },
  ])('rejects invalid reward metadata %s', async (override) => {
    await expect(verifier.reward(signedUrl(override))).rejects.toThrow();
    expect(rpc).not.toHaveBeenCalled();
  });
  it('never rewards an unverified client callback', async () => {
    await expect(verifier.reward('/callback?user_id=' + user)).rejects.toThrow();
    expect(rpc).not.toHaveBeenCalled();
  });
});
