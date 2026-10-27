import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class ExpiredWorkoutPhotosService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ExpiredWorkoutPhotosService.name);
  private timer?: ReturnType<typeof setInterval>;
  private running = false;
  constructor(private readonly supabase: SupabaseService) {}
  onModuleInit() {
    void this.clean();
    this.timer = setInterval(() => void this.clean(), 60 * 60 * 1000);
    this.timer.unref();
  }
  onModuleDestroy() { if (this.timer) clearInterval(this.timer); }
  async clean() {
    if (this.running) return;
    this.running = true;
    try {
      const db = this.supabase.serviceClient;
      // Bounded batches; failed storage operations remain queued for retry.
      const queued = await db.from('expired_workout_photos').select('path').order('queued_at').limit(100);
      if (queued.error) throw queued.error;
      const paths = (queued.data ?? []).map(row => row.path as string);
      if (!paths.length) return;
      const removed = await db.storage.from('progress-photos').remove(paths);
      if (removed.error) throw removed.error;
      const deleted = await db.from('expired_workout_photos').delete().in('path', paths);
      if (deleted.error) throw deleted.error;
    } catch { this.logger.warn('No se pudieron limpiar las fotos vencidas; se reintentará automáticamente.'); }
    finally { this.running = false; }
  }
}
