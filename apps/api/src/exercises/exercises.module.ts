import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { ExercisesController } from './exercises.controller';
import { ExercisesService } from './exercises.service';

@Module({
  imports: [SupabaseModule, AuthModule],
  controllers: [ExercisesController],
  providers: [ExercisesService],
})
export class ExercisesModule {}
