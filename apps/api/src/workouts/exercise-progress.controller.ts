import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { WorkoutsService } from './workouts.service';

@ApiTags('exercises')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller('v1/exercises')
export class ExerciseProgressController {
  constructor(private readonly workoutsService: WorkoutsService) {}

  @Get('progress')
  getProgress(@CurrentUser() user: AuthenticatedUser, @Query('name') name: string) {
    return this.workoutsService.getExerciseProgress(user.id, name ?? '');
  }
}
