import { ConfigService } from '@nestjs/config';
import { BillingService } from './billing.service';
import { SupabaseService } from '../supabase/supabase.service';

describe('Verified Pro subscriptions', () => {
  const rpc = jest.fn();
  let service: BillingService;
  let fetchMock: jest.SpyInstance;
  const until = new Date(Date.now() + 86400000).toISOString();
  beforeEach(() => {
    rpc.mockReset().mockResolvedValue({ data: { plan: 'free' }, error: null });
    service = new BillingService(
      { serviceClient: { rpc } } as unknown as SupabaseService,
      new ConfigService({ MONETIZATION_MODE: 'live', REVENUECAT_SECRET_KEY: 'private-test-only' }),
    );
    fetchMock = jest.spyOn(global, 'fetch');
  });
  afterEach(() => jest.restoreAllMocks());
  const response = (sandbox: boolean, expires = until) => ({
    subscriber: {
      entitlements: { pro: { expires_date: expires, product_identifier: 'pro_monthly' } },
      subscriptions: { pro_monthly: { is_sandbox: sandbox } },
    },
  });
  it('accepts a live entitlement verified directly with RevenueCat', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => response(false) });
    await service.syncPurchase('u1');
    expect(rpc).toHaveBeenCalledWith(
      'billing_sync_pro',
      expect.objectContaining({ p_user_id: 'u1', p_pro_until: until, p_environment: 'live' }),
    );
  });
  it('never promotes sandbox purchases into live Pro', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => response(true) });
    await service.syncPurchase('u1');
    expect(rpc).toHaveBeenCalledWith(
      'billing_sync_pro',
      expect.objectContaining({ p_pro_until: null }),
    );
  });
  it('removes Pro when a subscription has expired', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => response(false, '2020-01-01T00:00:00Z'),
    });
    await service.syncPurchase('u1');
    expect(rpc).toHaveBeenCalledWith(
      'billing_sync_pro',
      expect.objectContaining({ p_pro_until: null }),
    );
  });
  it('does not overwrite entitlement state during a provider outage', async () => {
    fetchMock.mockResolvedValue({ ok: false });
    await expect(service.syncPurchase('u1')).rejects.toThrow();
    expect(rpc).not.toHaveBeenCalled();
  });
  it('does not require a database or provider before activation', async () => {
    service = new BillingService(
      { serviceClient: { rpc } } as unknown as SupabaseService,
      new ConfigService(),
    );
    await expect(service.status('u1')).resolves.toMatchObject({
      mode: 'disabled',
      purchasesReady: false,
      rewardsReady: false,
      remaining: null,
    });
    expect(rpc).not.toHaveBeenCalled();
  });
});
