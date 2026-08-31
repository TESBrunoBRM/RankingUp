import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { DUEL_DEFAULT_TARGET_REPS } from '../domain/duel.rules';
import { CreateDuelDto } from './dto/create-duel.dto';
import { ReportDuelDto } from './dto/report-duel.dto';
import { DuelsService } from './duels.service';

@ApiTags('duels')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller('v1/duels')
export class DuelsController {
  constructor(private readonly duelsService: DuelsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @ApiOperation({ summary: 'Reta a otro usuario a un duelo de flexiones.' })
  challenge(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateDuelDto) {
    return this.duelsService.challenge(user.id, dto.opponentId, dto.targetReps ?? DUEL_DEFAULT_TARGET_REPS);
  }

  @Get('open')
  @ApiOperation({ summary: 'Retos recibidos, enviados y duelos en curso.' })
  listOpen(@CurrentUser() user: AuthenticatedUser) {
    return this.duelsService.listOpen(user.id);
  }

  @Get('history')
  @ApiOperation({ summary: 'Historial de duelos y balance de victorias.' })
  history(@CurrentUser() user: AuthenticatedUser) {
    return this.duelsService.history(user.id);
  }

  @Get(':duelId')
  @ApiOperation({ summary: 'Estado actual de un duelo.' })
  getState(@CurrentUser() user: AuthenticatedUser, @Param('duelId', ParseUUIDPipe) duelId: string) {
    return this.duelsService.getState(duelId, user.id);
  }

  @Post(':duelId/accept')
  @HttpCode(HttpStatus.OK)
  acceptDuel(@CurrentUser() user: AuthenticatedUser, @Param('duelId', ParseUUIDPipe) duelId: string) {
    return this.duelsService.accept(duelId, user.id);
  }

  @Post(':duelId/decline')
  @HttpCode(HttpStatus.OK)
  declineDuel(@CurrentUser() user: AuthenticatedUser, @Param('duelId', ParseUUIDPipe) duelId: string) {
    return this.duelsService.decline(duelId, user.id);
  }

  @Post(':duelId/cancel')
  @HttpCode(HttpStatus.OK)
  cancelDuel(@CurrentUser() user: AuthenticatedUser, @Param('duelId', ParseUUIDPipe) duelId: string) {
    return this.duelsService.cancel(duelId, user.id);
  }

  @Post(':duelId/report')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @ApiOperation({ summary: 'Reporta el resultado final; el backend decide el ganador y el XP.' })
  report(
    @CurrentUser() user: AuthenticatedUser,
    @Param('duelId', ParseUUIDPipe) duelId: string,
    @Body() dto: ReportDuelDto,
  ) {
    return this.duelsService.report(duelId, user.id, dto.reps);
  }

  @Post(':duelId/forfeit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Abandona un duelo en curso; cuenta como derrota.' })
  forfeit(@CurrentUser() user: AuthenticatedUser, @Param('duelId', ParseUUIDPipe) duelId: string) {
    return this.duelsService.forfeit(duelId, user.id);
  }
}
