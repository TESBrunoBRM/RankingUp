import { Module } from '@nestjs/common';
import { BillingModule } from '../billing/billing.module';
import { AuthModule } from '../auth/auth.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { FoodsController } from './foods.controller';
import { FoodsService } from './foods.service';
import { FoodVisionService } from './food-vision.service';
import { FoodDataCentralService } from './food-data-central.service';

@Module({
  imports: [AuthModule, SupabaseModule, BillingModule],
  controllers: [FoodsController],
  providers: [FoodsService, FoodVisionService, FoodDataCentralService],
  exports: [FoodsService],
})
export class FoodsModule {}
