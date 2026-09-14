import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { ProgressController } from './progress.controller';
import { ProgressService } from './progress.service';

@Module({ imports: [AuthModule, SupabaseModule], controllers: [ProgressController], providers: [ProgressService] })
export class ProgressModule {}
