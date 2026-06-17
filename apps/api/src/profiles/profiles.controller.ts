import { Body, Controller, HttpCode, HttpStatus, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { CompleteOnboardingDto } from './dto/complete-onboarding.dto';
import { UpdateProfileMetricsDto } from './dto/update-profile-metrics.dto';
import { ProfilesService } from './profiles.service';

@ApiTags('profile')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller('v1/profile')
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Post('onboarding')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Valida perfil inicial, calcula calorias y actualiza el perfil.' })
  completeOnboarding(@CurrentUser() user: AuthenticatedUser, @Body() dto: CompleteOnboardingDto) {
    return this.profilesService.completeOnboarding(user.id, dto);
  }

  @Patch('metrics')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Actualiza metricas de perfil validando ownership en backend.' })
  updateMetrics(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateProfileMetricsDto) {
    return this.profilesService.updateMetrics(user.id, dto);
  }

  @Post('minigame-xp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Recompensa 50 XP al usuario por ganar un minijuego.' })
  rewardMinigameXp(@CurrentUser() user: AuthenticatedUser) {
    return this.profilesService.rewardMinigameXp(user.id);
  }
}
