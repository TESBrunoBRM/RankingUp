import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { SaveExperienceDto } from './experience.dto';
import { ExperienceService } from './experience.service';

@ApiTags('experience')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller('v1/experience')
export class ExperienceController {
  constructor(private readonly experience: ExperienceService) {}

  @Get()
  get(@CurrentUser() user: AuthenticatedUser) { return this.experience.get(user.id); }

  @Put()
  save(@CurrentUser() user: AuthenticatedUser, @Body() dto: SaveExperienceDto) {
    return this.experience.save(user.id, dto);
  }
}
