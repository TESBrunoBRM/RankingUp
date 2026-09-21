import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { AuthenticatedUser } from '../auth/auth.types';

@Injectable()
export class SupabaseService {
  readonly anonClient: SupabaseClient;
  readonly serviceClient: SupabaseClient;

  constructor(config: ConfigService) {
    const supabaseUrl = config.get<string>('SUPABASE_URL');
    const anonKey = config.get<string>('SUPABASE_ANON_KEY');
    const serviceRoleKey = config.get<string>('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      throw new Error('Faltan SUPABASE_URL, SUPABASE_ANON_KEY o SUPABASE_SERVICE_ROLE_KEY.');
    }

    this.anonClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    this.serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  async getUserFromToken(token: string): Promise<AuthenticatedUser | null> {
    const { data, error } = await this.anonClient.auth.getUser(token);
    if (error || !data.user) return null;
    const appRole = data.user.app_metadata?.role;
    return {
      id: data.user.id,
      email: data.user.email ?? null,
      role: typeof appRole === 'string' ? appRole : null,
    };
  }
}
