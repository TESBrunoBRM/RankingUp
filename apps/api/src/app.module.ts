import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { FoodsModule } from './foods/foods.module';
import { HealthModule } from './health/health.module';
import { NutritionModule } from './nutrition/nutrition.module';
import { ProfilesModule } from './profiles/profiles.module';
import { RankingModule } from './ranking/ranking.module';
import { SupabaseModule } from './supabase/supabase.module';
import { WorkoutsModule } from './workouts/workouts.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    SupabaseModule,
    AuthModule,
    HealthModule,
    FoodsModule,
    NutritionModule,
    ProfilesModule,
    RankingModule,
    DashboardModule,
    WorkoutsModule,
  ],
})
export class AppModule {}
