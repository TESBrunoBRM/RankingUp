import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import type { SaveExperienceDto } from './experience.dto';

interface ExperienceRecord {
  features: string[];
  safety_version: string;
  acknowledged_at: string;
  guide_completed_at: string;
}

const toPreferences = (record: ExperienceRecord) => ({
  features: record.features,
  safetyVersion: record.safety_version,
  acknowledgedAt: record.acknowledged_at,
  guideCompletedAt: record.guide_completed_at,
});

@Injectable()
export class ExperienceService {
  constructor(private readonly supabase: SupabaseService) {}

  async get(userId: string) {
    const { data, error } = await this.supabase.serviceClient.from('user_experiences')
      .select('features,safety_version,acknowledged_at,guide_completed_at').eq('user_id', userId).maybeSingle();
    if (error) throw error;
    return data ? toPreferences(data) : null;
  }

  async save(userId: string, dto: SaveExperienceDto) {
    const now = new Date().toISOString();
    // An immutable receipt preserves which features and guidance were acknowledged.
    const { error: receiptError } = await this.supabase.serviceClient.from('experience_acceptances').insert({
      user_id: userId, features: dto.features, safety_version: dto.safetyVersion, acknowledged_at: now,
    });
    if (receiptError) throw receiptError;
    const { data, error } = await this.supabase.serviceClient.from('user_experiences').upsert({
      user_id: userId, features: dto.features, safety_version: dto.safetyVersion,
      acknowledged_at: now, guide_completed_at: now,
    }, { onConflict: 'user_id' }).select('features,safety_version,acknowledged_at,guide_completed_at').single();
    if (error) throw error;
    return toPreferences(data);
  }
}
