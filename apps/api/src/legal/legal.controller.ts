import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { SupabaseService } from '../supabase/supabase.service';

const DOCUMENT_VERSION = '2026-10-02';

@ApiTags('legal')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller('v1/legal/acceptance')
export class LegalController {
  constructor(private readonly supabase: SupabaseService) {}

  @Get()
  async current(@CurrentUser() user: AuthenticatedUser) {
    const { data, error } = await this.supabase.serviceClient.from('legal_acceptances')
      .select('accepted_at').eq('user_id', user.id).eq('document_version', DOCUMENT_VERSION).maybeSingle();
    if (error) throw error;
    return { version: DOCUMENT_VERSION, accepted: Boolean(data), acceptedAt: data?.accepted_at ?? null };
  }

  @Post()
  async accept(@CurrentUser() user: AuthenticatedUser) {
    const { data, error } = await this.supabase.serviceClient.from('legal_acceptances')
      .upsert({ user_id: user.id, document_version: DOCUMENT_VERSION }, { onConflict: 'user_id,document_version' })
      .select('accepted_at').single();
    if (error) throw error;
    return { version: DOCUMENT_VERSION, accepted: true, acceptedAt: data.accepted_at };
  }
}
