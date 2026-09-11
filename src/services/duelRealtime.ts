import type { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabaseClient } from '../lib/supabase';

/**
 * Canal en vivo de un duelo 1v1.
 *
 * El canal es privado: `realtime.messages` tiene politicas RLS que solo dejan
 * entrar a los dos participantes mientras el duelo sigue abierto (ver
 * supabase/migrations/20260831140000_pushup_duels.sql).
 *
 * Aqui solo viajan contadores para que cada uno vea al rival en tiempo real.
 * NO deciden nada: el ganador y el XP los calcula el backend a partir del
 * resultado que cada jugador reporta por HTTP al terminar.
 */

export const DUEL_EVENT_PROGRESS = 'progress';
export const DUEL_EVENT_FINISHED = 'finished';

export interface DuelProgressPayload {
  userId: string;
  reps: number;
}

export interface DuelFinishedPayload {
  userId: string;
  reps: number;
}

export interface DuelChannelHandlers {
  onRivalProgress?: (payload: DuelProgressPayload) => void;
  onRivalFinished?: (payload: DuelFinishedPayload) => void;
  onStatusChange?: (status: 'connecting' | 'connected' | 'error') => void;
}

export interface DuelChannel {
  sendProgress: (reps: number) => void;
  sendFinished: (reps: number) => void;
  leave: () => void;
}

export const joinDuelChannel = async (
  duelId: string,
  selfUserId: string,
  handlers: DuelChannelHandlers,
): Promise<DuelChannel> => {
  const supabase = getSupabaseClient();
  handlers.onStatusChange?.('connecting');

  // Los canales privados se autorizan con el JWT del usuario, no con la anon key.
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;
  if (accessToken) await supabase.realtime.setAuth(accessToken);

  const channel: RealtimeChannel = supabase.channel(duelId, {
    config: { private: true, broadcast: { self: false } },
  });

  const ignoreOwnEcho = <T extends { userId: string }>(handler?: (payload: T) => void) =>
    ({ payload }: { payload: T }) => {
      if (!payload || payload.userId === selfUserId) return;
      handler?.(payload);
    };

  channel
    .on('broadcast', { event: DUEL_EVENT_PROGRESS }, ignoreOwnEcho<DuelProgressPayload>(handlers.onRivalProgress))
    .on('broadcast', { event: DUEL_EVENT_FINISHED }, ignoreOwnEcho<DuelFinishedPayload>(handlers.onRivalFinished))
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') handlers.onStatusChange?.('connected');
      else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') handlers.onStatusChange?.('error');
    });

  const send = (event: string, payload: Record<string, unknown>) => {
    // Si el canal cae, el duelo sigue siendo valido: solo se pierde el marcador
    // en vivo del rival, y el resultado final va por HTTP.
    void channel.send({ type: 'broadcast', event, payload }).catch(() => undefined);
  };

  return {
    sendProgress: (reps: number) => send(DUEL_EVENT_PROGRESS, { userId: selfUserId, reps }),
    sendFinished: (reps: number) => send(DUEL_EVENT_FINISHED, { userId: selfUserId, reps }),
    leave: () => {
      void supabase.removeChannel(channel);
    },
  };
};
