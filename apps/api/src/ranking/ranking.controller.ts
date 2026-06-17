import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { RankingService } from './ranking.service';

@ApiTags('ranking')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller('v1/ranking')
export class RankingController {
  constructor(private readonly rankingService: RankingService) {}

  @Get()
  @ApiOperation({ summary: 'Devuelve ranking, progreso y fuerza relativa calculados en backend.' })
  getRanking(@CurrentUser() user: AuthenticatedUser) {
    return this.rankingService.getRanking(user.id);
  }
}
