import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { SupabaseModule } from "../supabase/supabase.module";
import { ProgressModule } from "../progress/progress.module";
import { ReportsController } from "./reports.controller";
import { ReportsService } from "./reports.service";

@Module({
  imports: [AuthModule, SupabaseModule, ProgressModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
