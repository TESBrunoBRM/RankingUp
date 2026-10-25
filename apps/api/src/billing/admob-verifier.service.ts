import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { verify } from 'node:crypto';
import { BillingService } from './billing.service';

@Injectable()
export class AdmobVerifierService {
  private keys: Array<{ keyId: number; pem: string }> = [];
  private fetchedAt = 0;
  constructor(
    private readonly config: ConfigService,
    private readonly billing: BillingService,
  ) {}

  async reward(originalUrl: string) {
    const unit = this.config.get<string>('ADMOB_REWARDED_AD_UNIT');
    if (!unit || this.billing.mode === 'disabled')
      throw new ServiceUnavailableException('Recompensas no configuradas.');
    const query = originalUrl.slice(originalUrl.indexOf('?') + 1);
    const match = /^(.+)&signature=([^&]+)&key_id=(\d+)$/.exec(query);
    if (!match) throw new BadRequestException('Firma de recompensa inválida.');
    const params = new URLSearchParams(query);
    if ([...new Set(params.keys())].some((key) => params.getAll(key).length !== 1))
      throw new BadRequestException('Parámetros duplicados.');
    const age = Date.now() - this.fetchedAt;
    if (
      age > 6 * 60 * 60_000 ||
      (!this.keys.some((key) => key.keyId.toString() === match[3]) && age > 60_000)
    ) {
      const response = await fetch('https://www.gstatic.com/admob/reward/verifier-keys.json', {
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok)
        throw new ServiceUnavailableException('No se pudo validar la recompensa con Google.');
      const payload = (await response.json()) as { keys?: Array<{ keyId: number; pem: string }> };
      if (
        !Array.isArray(payload.keys) ||
        payload.keys.some((key) => typeof key.pem !== 'string' || !Number.isInteger(key.keyId))
      )
        throw new ServiceUnavailableException('Claves de verificación no disponibles.');
      this.keys = payload.keys;
      this.fetchedAt = Date.now();
    }
    const key = this.keys.find((key) => key.keyId.toString() === match[3]);
    if (
      !key ||
      !verify(
        'sha256',
        Buffer.from(match[1], 'utf8'),
        key.pem,
        Buffer.from(decodeURIComponent(match[2]), 'base64url'),
      )
    )
      throw new BadRequestException('Firma de recompensa inválida.');
    const userId = params.get('user_id') ?? '';
    const challenge = params.get('custom_data') ?? '';
    const timestamp = Number(params.get('timestamp'));
    const transaction = params.get('transaction_id') ?? '';
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (
      !uuid.test(userId) ||
      !uuid.test(challenge) ||
      !transaction ||
      transaction.length > 200 ||
      !Number.isFinite(timestamp) ||
      Math.abs(Date.now() - timestamp) > 24 * 60 * 60_000 ||
      params.get('reward_amount') !== '1' ||
      params.get('ad_unit')?.split('/').pop() !== unit.split('/').pop()
    )
      throw new BadRequestException('Recompensa no válida para esta aplicación.');
    await this.billing.rpc('billing_reward_credit', {
      p_user_id: userId,
      p_challenge: challenge,
      p_transaction: transaction,
      p_environment: this.billing.mode,
    });
    // Google retries callbacks. An already applied or capped reward is still acknowledged.
    return { received: true };
  }
}
