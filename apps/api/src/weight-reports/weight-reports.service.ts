import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { calculateTargetCalories } from '../domain/profile.calculator';
import type { ProfileRecord } from '../domain/domain.types';
import type { RecordWeightDto } from './weight-reports.dto';

export interface WeightEntry { measured_on: string; weight: number; recorded_at: string }

@Injectable()
export class WeightReportsService {
  constructor(private readonly supabase: SupabaseService) {}
  private get db() { return this.supabase.serviceClient; }

  async getReport(userId: string, before?: string) {
    if (before && (!Number.isFinite(Date.parse(before)) || new Date(before).toISOString().slice(0, 10) !== before)) {
      throw new BadRequestException('Fecha de historial inválida.');
    }
    let query = this.db.from('weight_logs').select('measured_on,weight,recorded_at')
      .eq('user_id', userId).order('measured_on', { ascending: false }).limit(31);
    if (before) query = query.lt('measured_on', before);
    const [history, profile, latest] = await Promise.all([
      query,
      this.db.from('profiles').select('weight,target_weight,goal,target_calories').eq('id', userId).maybeSingle(),
      this.db.from('weight_logs').select('measured_on,weight,recorded_at').eq('user_id', userId)
        .order('measured_on', { ascending: false }).limit(1),
    ]);
    if (history.error || profile.error || latest.error) throw new InternalServerErrorException('No se pudo cargar el informe de peso.');
    if (!profile.data) throw new NotFoundException('Perfil no encontrado.');
    const newest = latest.data?.[0] as WeightEntry | undefined;
    let baseline: WeightEntry | null = null;
    if (newest) {
      const cutoff = new Date(`${newest.measured_on}T00:00:00Z`);
      cutoff.setUTCDate(cutoff.getUTCDate() - 7);
      const result = await this.db.from('weight_logs').select('measured_on,weight,recorded_at')
        .eq('user_id', userId).lte('measured_on', cutoff.toISOString().slice(0, 10))
        .gte('measured_on', new Date(cutoff.getTime() - 7 * 86400000).toISOString().slice(0, 10))
        .order('measured_on', { ascending: false }).limit(1);
      if (result.error) throw new InternalServerErrorException('No se pudo calcular la variación semanal.');
      baseline = result.data?.[0] as WeightEntry ?? null;
    }
    const rows = (history.data ?? []) as WeightEntry[];
    return {
      currentWeight: profile.data.weight === null ? null : Number(profile.data.weight),
      targetWeight: profile.data.target_weight === null ? null : Number(profile.data.target_weight),
      goal: profile.data.goal ?? null,
      targetCalories: profile.data.target_calories == null ? null : Number(profile.data.target_calories),
      latest: newest ?? null,
      weeklyChange: newest && baseline ? Math.round((Number(newest.weight) - Number(baseline.weight)) * 100) / 100 : null,
      comparisonDate: baseline?.measured_on ?? null,
      items: rows.slice(0, 30), nextCursor: rows.length > 30 ? rows[29].measured_on : null,
    };
  }

  async record(userId: string, dto: RecordWeightDto) {
    try { new Intl.DateTimeFormat('en', { timeZone: dto.timeZone }).format(); }
    catch { throw new BadRequestException('Zona horaria inválida.'); }
    const result = await this.db.from('profiles').select('*').eq('id', userId).maybeSingle();
    if (result.error) throw new InternalServerErrorException('No se pudo consultar el perfil.');
    if (!result.data) throw new NotFoundException('Perfil no encontrado.');
    const profile = result.data as ProfileRecord;
    const calories = profile.height && profile.age && profile.gender && profile.goal
      ? calculateTargetCalories({ weight: dto.weight, height: profile.height, age: profile.age, gender: profile.gender, goal: profile.goal }) : null;
    const saved = await this.db.rpc('record_weight', { p_user_id: userId, p_weight: dto.weight,
      p_timezone: dto.timeZone, p_target_calories: calories });
    if (saved.error) throw new InternalServerErrorException('No se pudo guardar el peso.');
    return this.getReport(userId);
  }

  async setTarget(userId: string, targetWeight: number | null | undefined) {
    if (targetWeight === undefined) throw new BadRequestException('Indica el peso objetivo o null para quitarlo.');
    const result = await this.db.from('profiles').update({ target_weight: targetWeight })
      .eq('id', userId).select('id').maybeSingle();
    if (result.error) throw new InternalServerErrorException('No se pudo guardar el objetivo.');
    if (!result.data) throw new NotFoundException('Perfil no encontrado.');
    return this.getReport(userId);
  }
}
