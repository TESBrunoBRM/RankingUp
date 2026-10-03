import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { LegalController } from './legal.controller';

@Module({ imports: [AuthModule, SupabaseModule], controllers: [LegalController] })
export class LegalModule {}
