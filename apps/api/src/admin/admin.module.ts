import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { FoodsModule } from "../foods/foods.module";
import { SupabaseModule } from "../supabase/supabase.module";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";

@Module({
  imports: [AuthModule, FoodsModule, SupabaseModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
