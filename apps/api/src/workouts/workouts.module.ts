import { Module } from '@nestjs/common';
import { BillingModule } from '../billing/billing.module';
import { AuthModule } from '../auth/auth.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { WorkoutsController } from './workouts.controller';
import { ExerciseProgressController } from './exercise-progress.controller';
import { WorkoutsService } from './workouts.service';

@Module({
  imports: [AuthModule, SupabaseModule, BillingModule],
  controllers: [WorkoutsController, ExerciseProgressController],
  providers: [WorkoutsService],
  exports: [WorkoutsService],
})
export class WorkoutsModule {}
