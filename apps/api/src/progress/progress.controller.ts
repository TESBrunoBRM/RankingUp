import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { PublishProgressDto, UploadUrlDto } from './dto/progress.dto';
import { ProgressService } from './progress.service';

@ApiTags('progress')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller('v1/progress')
export class ProgressController {
  constructor(private readonly service: ProgressService) {}

  @Post('upload-url') @Throttle({ default: { ttl: 60_000, limit: 10 } })
  uploadUrl(@CurrentUser() user: AuthenticatedUser, @Body() dto: UploadUrlDto) { return this.service.createUploadUrl(user.id, dto); }

  @Get('feed')
  feed(@CurrentUser() user: AuthenticatedUser, @Query('cursor') cursor?: string) { return this.service.feed(user.id, cursor); }

  @Get('profile/:profileId')
  profile(@CurrentUser() user: AuthenticatedUser, @Param('profileId') profileId: string, @Query('cursor') cursor?: string) { return this.service.profilePosts(user.id, profileId, cursor); }

  @Patch(':workoutLogId')
  publish(@CurrentUser() user: AuthenticatedUser, @Param('workoutLogId') id: string, @Body() dto: PublishProgressDto) { return this.service.publish(user.id, id, dto); }

  @Post(':workoutLogId/like')
  like(@CurrentUser() user: AuthenticatedUser, @Param('workoutLogId') id: string) { return this.service.like(user.id, id, true); }

  @Delete(':workoutLogId/like')
  unlike(@CurrentUser() user: AuthenticatedUser, @Param('workoutLogId') id: string) { return this.service.like(user.id, id, false); }

  @Delete(':workoutLogId/photo')
  deletePhoto(@CurrentUser() user: AuthenticatedUser, @Param('workoutLogId') id: string) { return this.service.deletePhoto(user.id, id); }

  @Delete(':workoutLogId')
  unpublish(@CurrentUser() user: AuthenticatedUser, @Param('workoutLogId') id: string) { return this.service.unpublish(user.id, id); }
}
