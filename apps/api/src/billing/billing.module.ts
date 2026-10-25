import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { BillingController, BillingCallbacksController } from './billing.controller';
import { BillingService } from './billing.service';
import { AiCreditsInterceptor } from './ai-credits.interceptor';
import { AdmobVerifierService } from './admob-verifier.service';

@Module({
  imports: [AuthModule, SupabaseModule],
  controllers: [BillingController, BillingCallbacksController],
  providers: [BillingService, AiCreditsInterceptor, AdmobVerifierService],
  exports: [BillingService, AiCreditsInterceptor],
})
export class BillingModule {}
