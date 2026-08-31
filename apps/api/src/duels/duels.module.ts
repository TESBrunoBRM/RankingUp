import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { DuelsController } from './duels.controller';
import { DuelsService } from './duels.service';

@Module({
  imports: [SupabaseModule, AuthModule],
  controllers: [DuelsController],
  providers: [DuelsService],
})
export class DuelsModule {}
