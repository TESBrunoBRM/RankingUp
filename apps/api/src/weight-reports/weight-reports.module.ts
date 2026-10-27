import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { WeightReportsController } from './weight-reports.controller';
import { WeightReportsService } from './weight-reports.service';

@Module({ imports: [AuthModule, SupabaseModule], controllers: [WeightReportsController], providers: [WeightReportsService] })
export class WeightReportsModule {}
