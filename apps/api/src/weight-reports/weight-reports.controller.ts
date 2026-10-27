import { Body, Controller, Get, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { RecordWeightDto, WeightHistoryQueryDto, WeightTargetDto } from './weight-reports.dto';
import { WeightReportsService } from './weight-reports.service';

@ApiTags('weight-reports')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller('v1/weight-reports')
export class WeightReportsController {
  constructor(private readonly reports: WeightReportsService) {}
  @Get()
  get(@CurrentUser() user: AuthenticatedUser, @Query() query: WeightHistoryQueryDto) {
    return this.reports.getReport(user.id, query.before);
  }
  @Post()
  record(@CurrentUser() user: AuthenticatedUser, @Body() dto: RecordWeightDto) {
    return this.reports.record(user.id, dto);
  }
  @Patch('target')
  target(@CurrentUser() user: AuthenticatedUser, @Body() dto: WeightTargetDto) {
    return this.reports.setTarget(user.id, dto.targetWeight);
  }
}
