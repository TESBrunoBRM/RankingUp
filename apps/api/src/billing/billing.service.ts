import {
  BadRequestException,
  HttpException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { SupabaseService } from '../supabase/supabase.service';

export interface CreditStatus {
  plan: 'free' | 'pro';
  remaining: number | null;
  monthlyAllowance: number;
  used: number;
  rewards: number;
  period: string;
  resetsAt: string | null;
  proUntil: string | null;
}
export type Reservation = {
  status: 'reserved' | 'cached' | 'pending' | 'failed' | 'conflict' | 'exhausted';
  response?: unknown;
};

@Injectable()
export class BillingService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly config: ConfigService,
  ) {}

  get mode(): 'disabled' | 'test' | 'live' {
    const mode = this.config.get<string>('MONETIZATION_MODE');
    return mode === 'test' || mode === 'live' ? mode : 'disabled';
  }

  async rpc<T>(name: string, args: Record<string, unknown>): Promise<T> {
    const { data, error } = await this.supabase.serviceClient.rpc(name, args);
    if (error)
      throw new ServiceUnavailableException(
        'No se pudo comprobar el saldo de IA. Intenta nuevamente.',
      );
    return data as T;
  }

  async status(userId: string) {
    const status =
      this.mode === 'disabled'
        ? {
            plan: 'free' as const,
            remaining: null,
            monthlyAllowance: 3,
            used: 0,
            rewards: 0,
            period: '',
            resetsAt: null,
            proUntil: null,
          }
        : await this.rpc<CreditStatus>('billing_credit_status', {
            p_user_id: userId,
            p_environment: this.mode,
          });
    return {
      ...status,
      mode: this.mode,
      purchasesReady:
        this.mode !== 'disabled' && Boolean(this.config.get<string>('REVENUECAT_SECRET_KEY')),
      rewardsReady:
        this.mode !== 'disabled' && Boolean(this.config.get<string>('ADMOB_REWARDED_AD_UNIT')),
    };
  }

  reserve(userId: string, requestId: string, fingerprint: string) {
    return this.rpc<Reservation>('billing_reserve_credit', {
      p_user_id: userId,
      p_request_id: requestId,
      p_fingerprint: fingerprint,
      p_environment: this.mode,
    });
  }

  finish(userId: string, requestId: string, success: boolean, response?: unknown) {
    return this.rpc('billing_finish_credit', {
      p_user_id: userId,
      p_request_id: requestId,
      p_success: success,
      p_response: response ?? null,
    });
  }

  async createReward(userId: string) {
    const status = await this.status(userId);
    if (!status.rewardsReady)
      throw new ServiceUnavailableException(
        'Los anuncios con recompensa todavía no están disponibles.',
      );
    if (status.plan === 'pro' || status.remaining === null || status.remaining >= 3)
      throw new BadRequestException('Ya tienes todos tus usos disponibles.');
    const id = randomUUID();
    const expiresAt = new Date(Date.now() + 20 * 60_000).toISOString();
    const { error } = await this.supabase.serviceClient
      .from('ai_reward_challenges')
      .insert({ id, user_id: userId, period: status.period, expires_at: expiresAt });
    if (error) throw new ServiceUnavailableException('No se pudo preparar la recompensa.');
    return { id, expiresAt };
  }

  async rewardStatus(userId: string, id: string) {
    const { data, error } = await this.supabase.serviceClient
      .from('ai_reward_challenges')
      .select('credited,expires_at')
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle();
    if (error || !data) throw new BadRequestException('Recompensa no encontrada.');
    return { credited: data.credited as boolean, expiresAt: data.expires_at as string };
  }

  async syncPurchase(userId: string) {
    const key = this.config.get<string>('REVENUECAT_SECRET_KEY');
    if (!key || this.mode === 'disabled')
      throw new ServiceUnavailableException('Las suscripciones todavía no están disponibles.');
    const verifiedAt = new Date().toISOString();
    const response = await fetch(
      `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`,
      {
        headers: { Authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(10_000),
      },
    );
    if (!response.ok)
      throw new ServiceUnavailableException('No se pudo verificar la suscripción con la tienda.');
    const payload = (await response.json()) as {
      subscriber?: {
        entitlements?: Record<
          string,
          { expires_date?: string | null; product_identifier?: string }
        >;
        subscriptions?: Record<string, { is_sandbox?: boolean }>;
      };
    };
    if (
      !payload.subscriber ||
      !payload.subscriber.entitlements ||
      !payload.subscriber.subscriptions
    ) {
      throw new ServiceUnavailableException(
        'La tienda devolvió una suscripción que no se pudo verificar.',
      );
    }
    const entitlement =
      payload.subscriber.entitlements[this.config.get<string>('REVENUECAT_ENTITLEMENT') ?? 'pro'];
    const subscription = entitlement?.product_identifier
      ? payload.subscriber.subscriptions[entitlement.product_identifier]
      : undefined;
    const allowedEnvironment =
      this.mode === 'test' ? subscription?.is_sandbox === true : subscription?.is_sandbox === false;
    const until = entitlement?.expires_date;
    const proUntil =
      allowedEnvironment &&
      until &&
      Number.isFinite(Date.parse(until)) &&
      Date.parse(until) > Date.now()
        ? until
        : null;
    await this.rpc('billing_sync_pro', {
      p_user_id: userId,
      p_pro_until: proUntil,
      p_verified_at: verifiedAt,
      p_environment: this.mode,
    });
    return this.status(userId);
  }

  exhausted(): never {
    throw new HttpException(
      {
        code: 'AI_QUOTA_EXHAUSTED',
        message:
          'Agotaste tus 3 usos mensuales de IA. Puedes recuperar un uso viendo un anuncio disponible o consultar RankingUp Pro.',
      },
      402,
    );
  }
}
