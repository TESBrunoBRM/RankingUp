import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { DuelsModule } from './duels/duels.module';
import { ExercisesModule } from './exercises/exercises.module';
import { FoodsModule } from './foods/foods.module';
import { HealthModule } from './health/health.module';
import { HomeContentModule } from './home-content/home-content.module';
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
    // Limite global. Los endpoints que otorgan XP o escriben en el ranking
    // llevan ademas su propio @Throttle mas estricto.
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 120 }]),
    SupabaseModule,
    AuthModule,
    HealthModule,
    HomeContentModule,
    DuelsModule,
    ExercisesModule,
    FoodsModule,
    NutritionModule,
    ProfilesModule,
    RankingModule,
    DashboardModule,
    WorkoutsModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
