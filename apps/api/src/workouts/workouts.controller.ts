import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { GeneratePlanDto } from './dto/generate-plan.dto';
import { LogWorkoutSessionDto } from './dto/log-workout-session.dto';
import { WorkoutsService } from './workouts.service';

@ApiTags('workouts')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller('v1/workouts')
export class WorkoutsController {
  constructor(private readonly workoutsService: WorkoutsService) {}

  @Post('log-session')
  @HttpCode(HttpStatus.OK)
  // Es la via principal de XP: sin limite propio heredaba solo el global de
  // 120 req/min, mucho mas laxo que el resto de endpoints que reparten XP.
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @ApiOperation({ summary: 'Registra un entrenamiento y calcula XP en backend.' })
  logSession(@CurrentUser() user: AuthenticatedUser, @Body() dto: LogWorkoutSessionDto) {
    return this.workoutsService.logSession(user.id, dto);
  }

  @Post('generate-plan')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Genera y guarda una rutina deterministica.' })
  generatePlan(@CurrentUser() user: AuthenticatedUser, @Body() dto: GeneratePlanDto) {
    return this.workoutsService.generatePlan(user.id, dto);
  }
}
