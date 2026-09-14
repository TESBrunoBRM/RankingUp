import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { WorkoutsController } from './workouts.controller';
import { ExerciseProgressController } from './exercise-progress.controller';
import { WorkoutsService } from './workouts.service';

@Module({
  imports: [AuthModule, SupabaseModule],
  controllers: [WorkoutsController, ExerciseProgressController],
  providers: [WorkoutsService],
  exports: [WorkoutsService],
})
export class WorkoutsModule {}
