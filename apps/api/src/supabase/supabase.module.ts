import { Module } from '@nestjs/common';
import { SupabaseRepository } from './supabase.repository';
import { SupabaseService } from './supabase.service';

@Module({
  providers: [SupabaseService, SupabaseRepository],
  exports: [SupabaseService, SupabaseRepository],
})
export class SupabaseModule {}
