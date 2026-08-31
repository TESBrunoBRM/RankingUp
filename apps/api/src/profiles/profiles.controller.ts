import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Delete, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { CalculateCalorieTargetDto } from './dto/calculate-calorie-target.dto';
import { CompleteOnboardingDto } from './dto/complete-onboarding.dto';
import { RewardMinigameDto } from './dto/reward-minigame.dto';
import { SearchProfilesDto } from './dto/search-profiles.dto';
import { UpdateProfileMetricsDto } from './dto/update-profile-metrics.dto';
import { UpdateSocialProfileDto } from './dto/update-social-profile.dto';
import { ProfilesService } from './profiles.service';

@ApiTags('profile')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller('v1/profile')
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Get()
  @ApiOperation({ summary: 'Devuelve el perfil privado del usuario, estadisticas y niveles de fuerza.' })
  getOwnProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.profilesService.getOwnProfile(user.id);
  }

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

  @Patch('social')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Actualiza identidad y visibilidad del perfil social.' })
  updateSocialProfile(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateSocialProfileDto) {
    return this.profilesService.updateSocialProfile(user.id, dto);
  }

  @Post('calorie-target')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Calcula una meta calorica sin persistirla.' })
  calculateCalorieTarget(@Body() dto: CalculateCalorieTargetDto) {
    return this.profilesService.calculateCalorieTarget(dto);
  }

  @Post('minigame-xp')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @ApiOperation({ summary: 'Recompensa 50 XP al usuario por ganar un minijuego.' })
  rewardMinigameXp(@CurrentUser() user: AuthenticatedUser, @Body() dto: RewardMinigameDto) {
    return this.profilesService.rewardMinigameXp(user.id, dto.reps);
  }
}

@ApiTags('profiles')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller('v1/profiles')
export class SocialProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Get('search')
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  search(@CurrentUser() user: AuthenticatedUser, @Query() dto: SearchProfilesDto) {
    return this.profilesService.searchProfiles(user.id, dto.query);
  }

  @Get(':profileId/comparison')
  compare(@CurrentUser() user: AuthenticatedUser, @Param('profileId') profileId: string) {
    return this.profilesService.compareProfiles(user.id, profileId);
  }

  @Get(':profileId')
  getProfile(@CurrentUser() user: AuthenticatedUser, @Param('profileId') profileId: string) {
    return this.profilesService.getPublicProfile(user.id, profileId);
  }

  @Post(':profileId/follow')
  @HttpCode(HttpStatus.OK)
  follow(@CurrentUser() user: AuthenticatedUser, @Param('profileId') profileId: string) {
    return this.profilesService.followProfile(user.id, profileId);
  }

  @Delete(':profileId/follow')
  unfollow(@CurrentUser() user: AuthenticatedUser, @Param('profileId') profileId: string) {
    return this.profilesService.unfollowProfile(user.id, profileId);
  }
}
