import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { ExperienceController } from './experience.controller';
import { ExperienceService } from './experience.service';

@Module({ imports: [AuthModule, SupabaseModule], controllers: [ExperienceController], providers: [ExperienceService] })
export class ExperienceModule {}
