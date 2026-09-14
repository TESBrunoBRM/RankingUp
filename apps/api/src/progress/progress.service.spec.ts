import { ForbiddenException } from '@nestjs/common';
import { ProgressService } from './progress.service';
import { SupabaseService } from '../supabase/supabase.service';

const chain = (result: unknown) => {
  const query = {
    select: jest.fn(), eq: jest.fn(), maybeSingle: jest.fn().mockResolvedValue({ data: result, error: null }),
    not: jest.fn(), order: jest.fn(), limit: jest.fn(), in: jest.fn(), lt: jest.fn(), update: jest.fn(),
  };
  Object.values(query).forEach((method) => { if (method !== query.maybeSingle) method.mockReturnValue(query); });
  return query;
};

describe('ProgressService', () => {
  it('rejects a photo path from another user before touching storage', async () => {
    const logQuery = chain({ id: 'log-1', user_id: 'author' });
    const profileQuery = chain({ age: 25 });
    const storage = { info: jest.fn() };
    const db = { from: jest.fn((table: string) => table === 'workout_logs' ? logQuery : profileQuery), storage: { from: jest.fn(() => storage) } };
    const service = new ProgressService({ serviceClient: db } as unknown as SupabaseService);
    await expect(service.publish('author', 'log-1', { photoPath: 'someone-else/log-1/photo.jpg' })).rejects.toThrow(ForbiddenException);
    expect(storage.info).not.toHaveBeenCalled();
  });

  it('requires age 16 for photo upload', async () => {
    const logQuery = chain({ id: 'log-1', user_id: 'author' });
    const profileQuery = chain({ age: 15 });
    const db = { from: jest.fn((table: string) => table === 'workout_logs' ? logQuery : profileQuery), storage: { from: jest.fn() } };
    const service = new ProgressService({ serviceClient: db } as unknown as SupabaseService);
    await expect(service.createUploadUrl('author', { workoutLogId: 'log-1', contentType: 'image/jpeg', sizeBytes: 100 })).rejects.toThrow(ForbiddenException);
    expect(db.storage.from).not.toHaveBeenCalled();
  });

  it('hides all posts of a private profile from strangers', async () => {
    const profileQuery = chain({ is_public: false });
    const db = { from: jest.fn(() => profileQuery) };
    const service = new ProgressService({ serviceClient: db } as unknown as SupabaseService);
    expect(await service.profilePosts('stranger', 'author')).toEqual({ items: [], nextCursor: null });
    expect(db.from).toHaveBeenCalledTimes(1);
  });

  it('removes the storage object and unpublishes without deleting workout XP', async () => {
    const logQuery = chain({ id: 'log-1', user_id: 'author', photo_path: 'author/log-1/photo.jpg' });
    const storage = { remove: jest.fn().mockResolvedValue({ error: null }) };
    const db = { from: jest.fn(() => logQuery), storage: { from: jest.fn(() => storage) } };
    const service = new ProgressService({ serviceClient: db } as unknown as SupabaseService);
    expect(await service.unpublish('author', 'log-1')).toEqual({ unpublished: true });
    expect(storage.remove).toHaveBeenCalledWith(['author/log-1/photo.jpg']);
    expect(logQuery.update).toHaveBeenCalledWith(expect.objectContaining({ photo_path: null, published_at: null }));
    expect(db.from).not.toHaveBeenCalledWith('profiles');
  });

  it('feed includes self and followed public/follower posts but hides private profiles and posts', async () => {
    const post = (id: string, user_id: string, visibility: string) => ({ id, user_id, visibility,
      published_at: '2026-09-14T00:00:00Z', photo_path: null });
    const rows: Record<string, unknown[]> = {
      profile_follows: [{ following_id: 'friend' }, { following_id: 'hidden' }],
      workout_logs: [post('own', 'viewer', 'private'), post('pub', 'friend', 'public'),
        post('followers', 'friend', 'followers'), post('private', 'friend', 'private'), post('hidden', 'hidden', 'public')],
      workout_log_likes: [],
    };
    let profileCalls = 0;
    const db = { from: jest.fn((table: string) => {
      const data = table === 'profiles' ? ++profileCalls === 1
        ? [{ id: 'viewer', is_public: false }, { id: 'friend', is_public: true }, { id: 'hidden', is_public: false }]
        : [{ id: 'viewer', name: 'Me' }, { id: 'friend', name: 'Friend' }]
        : rows[table];
      const query: Record<string, jest.Mock | ((resolve: (value: unknown) => void) => void)> = {};
      for (const method of ['select', 'eq', 'not', 'order', 'limit', 'in', 'lt']) query[method] = jest.fn(() => query);
      query.then = (resolve: (value: unknown) => void) => resolve({ data, error: null });
      return query;
    }), storage: { from: jest.fn() } };
    const service = new ProgressService({ serviceClient: db } as unknown as SupabaseService);
    const result = await service.feed('viewer');
    expect(result.items.map((item) => item.id)).toEqual(['own', 'pub', 'followers']);
    expect(db.storage.from).not.toHaveBeenCalled();
  });
});
