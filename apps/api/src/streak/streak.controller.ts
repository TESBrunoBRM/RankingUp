import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { CheckInDto } from './dto/check-in.dto';
import { StreakService } from './streak.service';

@ApiTags('streak')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller('v1/streak')
export class StreakController {
  constructor(private readonly streakService: StreakService) {}

  @Post('check-in')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @ApiOperation({ summary: 'Registra el uso de Home para la fecha local calculada en el servidor.' })
  checkIn(@CurrentUser() user: AuthenticatedUser, @Body() dto: CheckInDto) {
    return this.streakService.checkIn(user.id, dto.timeZone);
  }

  @Get()
  getStreak(@CurrentUser() user: AuthenticatedUser, @Query() dto: CheckInDto) {
    return this.streakService.getStreak(user.id, dto.timeZone);
  }
}
