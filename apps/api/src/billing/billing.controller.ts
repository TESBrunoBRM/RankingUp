import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { IsObject, IsOptional, IsString } from 'class-validator';
import { Throttle } from '@nestjs/throttler';
import { timingSafeEqual } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { BillingService } from './billing.service';
import { AdmobVerifierService } from './admob-verifier.service';

class RevenuecatWebhookDto {
  @IsOptional() @IsString() api_version?: string;
  @IsObject() event!: Record<string, unknown>;
}

@Controller('v1/billing')
@UseGuards(SupabaseAuthGuard)
export class BillingController {
  constructor(private readonly billing: BillingService) {}
  @Get() status(@CurrentUser() user: AuthenticatedUser) {
    return this.billing.status(user.id);
  }
  @Post('sync')
  @HttpCode(200)
  @Throttle({ default: { ttl: 60_000, limit: 6 } })
  sync(@CurrentUser() user: AuthenticatedUser) {
    return this.billing.syncPurchase(user.id);
  }
  @Post('reward')
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  reward(@CurrentUser() user: AuthenticatedUser) {
    return this.billing.createReward(user.id);
  }
  @Get('reward/:id') rewardStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.billing.rewardStatus(user.id, id);
  }
}

@Controller('v1/billing/callbacks')
export class BillingCallbacksController {
  constructor(
    private readonly billing: BillingService,
    private readonly config: ConfigService,
    private readonly admob: AdmobVerifierService,
  ) {}
  @Get('admob') admobReward(@Req() request: Request) {
    return this.admob.reward(request.originalUrl);
  }
  @Post('revenuecat')
  @HttpCode(200)
  async revenuecat(
    @Headers('authorization') authorization: string | undefined,
    @Body() dto: RevenuecatWebhookDto,
  ) {
    const secret = this.config.get<string>('REVENUECAT_WEBHOOK_AUTH');
    if (
      !secret ||
      !authorization ||
      Buffer.byteLength(secret) !== Buffer.byteLength(authorization) ||
      !timingSafeEqual(Buffer.from(secret), Buffer.from(authorization))
    )
      throw new UnauthorizedException();
    const candidates = [
      dto.event.app_user_id,
      ...(Array.isArray(dto.event.transferred_from) ? dto.event.transferred_from : []),
      ...(Array.isArray(dto.event.transferred_to) ? dto.event.transferred_to : []),
    ];
    const ids = [
      ...new Set(
        candidates.filter(
          (id): id is string => typeof id === 'string' && /^[0-9a-f-]{36}$/i.test(id),
        ),
      ),
    ].slice(0, 20);
    // Read authoritative current entitlements instead of applying possibly out-of-order events.
    for (const id of ids) await this.billing.syncPurchase(id);
    return { received: true };
  }
}
