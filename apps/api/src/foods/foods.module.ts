import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { FoodsController } from './foods.controller';
import { FoodsService } from './foods.service';
import { FoodVisionService } from './food-vision.service';

@Module({
  imports: [AuthModule, SupabaseModule],
  controllers: [FoodsController],
  providers: [FoodsService, FoodVisionService],
  exports: [FoodsService],
})
export class FoodsModule {}
