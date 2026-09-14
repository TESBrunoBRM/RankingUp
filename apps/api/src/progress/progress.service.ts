import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { SupabaseService } from '../supabase/supabase.service';
import type { PublishProgressDto, UploadUrlDto } from './dto/progress.dto';

type Visibility = 'public' | 'followers' | 'private';
type PostRow = {
  id: string; user_id: string; name: string | null; description: string | null;
  photo_path: string | null; visibility: Visibility; published_at: string;
  date: string; duration_seconds: number | null; total_volume: number; xp_awarded: number;
};

@Injectable()
export class ProgressService {
  constructor(private readonly supabase: SupabaseService) {}
  private get db() { return this.supabase.serviceClient; }

  private async ownedLog(userId: string, logId: string) {
    const { data, error } = await this.db.from('workout_logs').select('*').eq('id', logId).eq('user_id', userId).maybeSingle();
    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException('Entrenamiento no encontrado.');
    return data;
  }

  private async assertPhotoAllowed(userId: string) {
    const { data, error } = await this.db.from('profiles').select('age').eq('id', userId).maybeSingle();
    if (error) throw new BadRequestException(error.message);
    if (!data?.age || data.age < 16) throw new ForbiddenException('Las fotos de progreso requieren 16 anos o mas.');
  }

  async createUploadUrl(userId: string, dto: UploadUrlDto) {
    await this.ownedLog(userId, dto.workoutLogId);
    await this.assertPhotoAllowed(userId);
    const ext = dto.contentType === 'image/png' ? 'png' : dto.contentType === 'image/webp' ? 'webp' : 'jpg';
    const path = `${userId}/${dto.workoutLogId}/${randomUUID()}.${ext}`;
    const { data, error } = await this.db.storage.from('progress-photos').createSignedUploadUrl(path);
    if (error || !data) throw new BadRequestException(error?.message ?? 'No se pudo preparar la subida.');
    return { uploadUrl: data.signedUrl, path, token: data.token };
  }

  async publish(userId: string, logId: string, dto: PublishProgressDto) {
    const log = await this.ownedLog(userId, logId);
    if (dto.photoPath !== undefined) {
      await this.assertPhotoAllowed(userId);
      if (!dto.photoPath.startsWith(`${userId}/${logId}/`) || dto.photoPath.includes('..')) {
        throw new ForbiddenException('La foto no pertenece a este entrenamiento.');
      }
      const { data, error } = await this.db.storage.from('progress-photos').info(dto.photoPath);
      if (error || !data) throw new BadRequestException('La foto no existe en Storage.');
    }
    const { data, error } = await this.db.from('workout_logs').update({
      name: dto.name?.trim() || log.name,
      description: dto.description?.trim() ?? log.description ?? null,
      photo_path: dto.photoPath ?? log.photo_path ?? null,
      visibility: dto.visibility ?? log.visibility ?? 'followers',
      published_at: log.published_at ?? new Date().toISOString(),
    }).eq('id', logId).eq('user_id', userId).select().single();
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  private async canView(viewerId: string, authorId: string): Promise<{ allowed: boolean; following: boolean }> {
    if (viewerId === authorId) return { allowed: true, following: true };
    const { data: profile, error } = await this.db.from('profiles').select('is_public').eq('id', authorId).maybeSingle();
    if (error) throw new BadRequestException(error.message);
    if (!profile?.is_public) return { allowed: false, following: false };
    const { data: follow, error: followError } = await this.db.from('profile_follows')
      .select('follower_id').eq('follower_id', viewerId).eq('following_id', authorId).maybeSingle();
    if (followError) throw new BadRequestException(followError.message);
    return { allowed: true, following: !!follow };
  }

  private async decorate(viewerId: string, posts: PostRow[]) {
    if (!posts.length) return [];
    const ids = posts.map((post) => post.id);
    const authorIds = [...new Set(posts.map((post) => post.user_id))];
    const [{ data: profiles, error: profileError }, { data: likes, error: likeError }] = await Promise.all([
      this.db.from('profiles').select('id,name,username').in('id', authorIds),
      this.db.from('workout_log_likes').select('workout_log_id,user_id').in('workout_log_id', ids),
    ]);
    if (profileError || likeError) throw new BadRequestException(profileError?.message ?? likeError?.message);
    const authors = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
    return Promise.all(posts.map(async (post) => {
      let photoUrl: string | null = null;
      if (post.photo_path) {
        const { data } = await this.db.storage.from('progress-photos').createSignedUrl(post.photo_path, 3600);
        photoUrl = data?.signedUrl ?? null;
      }
      const postLikes = (likes ?? []).filter((like) => like.workout_log_id === post.id);
      return { ...post, author: authors.get(post.user_id) ?? null, photoUrl,
        likeCount: postLikes.length, likedByMe: postLikes.some((like) => like.user_id === viewerId) };
    }));
  }

  async profilePosts(viewerId: string, authorId: string, cursor?: string) {
    const access = await this.canView(viewerId, authorId);
    if (!access.allowed) return { items: [], nextCursor: null };
    let query = this.db.from('workout_logs').select('*').eq('user_id', authorId)
      .not('published_at', 'is', null).order('published_at', { ascending: false }).limit(21);
    if (cursor) query = query.lt('published_at', cursor);
    if (viewerId !== authorId) query = query.in('visibility', access.following ? ['public', 'followers'] : ['public']);
    const { data, error } = await query;
    if (error) throw new BadRequestException(error.message);
    const posts = (data ?? []) as PostRow[];
    return { items: await this.decorate(viewerId, posts.slice(0, 20)), nextCursor: posts.length > 20 ? posts[19].published_at : null };
  }

  async feed(viewerId: string, cursor?: string) {
    const { data: follows, error: followError } = await this.db.from('profile_follows').select('following_id').eq('follower_id', viewerId);
    if (followError) throw new BadRequestException(followError.message);
    const authorIds = [viewerId, ...(follows ?? []).map((row) => row.following_id as string)];
    let query = this.db.from('workout_logs').select('*').in('user_id', authorIds)
      .not('published_at', 'is', null).order('published_at', { ascending: false }).limit(40);
    if (cursor) query = query.lt('published_at', cursor);
    const { data, error } = await query;
    if (error) throw new BadRequestException(error.message);
    const candidates = (data ?? []) as PostRow[];
    const authorIdsInPage = [...new Set(candidates.map((post) => post.user_id))];
    const { data: profiles, error: profileError } = authorIdsInPage.length
      ? await this.db.from('profiles').select('id,is_public').in('id', authorIdsInPage)
      : { data: [], error: null };
    if (profileError) throw new BadRequestException(profileError.message);
    const publicAuthors = new Set((profiles ?? []).filter((profile) => profile.is_public).map((profile) => profile.id));
    const followedAuthors = new Set((follows ?? []).map((row) => row.following_id as string));
    const posts = candidates.filter((post) => {
      if (post.user_id === viewerId) return true;
      if (!publicAuthors.has(post.user_id)) return false;
      return post.visibility === 'public' || (followedAuthors.has(post.user_id) && post.visibility === 'followers');
    }).slice(0, 20);
    return { items: await this.decorate(viewerId, posts), nextCursor: candidates.length === 40 ? candidates[39].published_at : null };
  }

  async like(userId: string, logId: string, liked: boolean) {
    const { data: post, error } = await this.db.from('workout_logs').select('id,user_id,visibility,published_at').eq('id', logId).maybeSingle();
    if (error) throw new BadRequestException(error.message);
    if (!post?.published_at) throw new NotFoundException('Publicacion no encontrada.');
    const access = await this.canView(userId, post.user_id);
    if (!access.allowed || (post.user_id !== userId && post.visibility === 'private')
      || (post.user_id !== userId && post.visibility === 'followers' && !access.following)) {
      throw new ForbiddenException('No puedes ver esta publicacion.');
    }
    const query = liked
      ? this.db.from('workout_log_likes').upsert({ workout_log_id: logId, user_id: userId }, { onConflict: 'workout_log_id,user_id' })
      : this.db.from('workout_log_likes').delete().eq('workout_log_id', logId).eq('user_id', userId);
    const { error: likeError } = await query;
    if (likeError) throw new BadRequestException(likeError.message);
    return { liked };
  }

  async deletePhoto(userId: string, logId: string) {
    const log = await this.ownedLog(userId, logId);
    if (log.photo_path) {
      const { error } = await this.db.storage.from('progress-photos').remove([log.photo_path]);
      if (error) throw new BadRequestException(error.message);
      const { error: updateError } = await this.db.from('workout_logs').update({ photo_path: null }).eq('id', logId).eq('user_id', userId);
      if (updateError) throw new BadRequestException(updateError.message);
    }
    return { deleted: true };
  }

  async unpublish(userId: string, logId: string) {
    const log = await this.ownedLog(userId, logId);
    if (log.photo_path) {
      const { error } = await this.db.storage.from('progress-photos').remove([log.photo_path]);
      if (error) throw new BadRequestException(error.message);
    }
    const { error } = await this.db.from('workout_logs').update({
      photo_path: null, description: null, published_at: null, visibility: 'private',
    }).eq('id', logId).eq('user_id', userId);
    if (error) throw new BadRequestException(error.message);
    return { unpublished: true };
  }
}
