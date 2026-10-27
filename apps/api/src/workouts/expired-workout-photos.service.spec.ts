import { SupabaseService } from '../supabase/supabase.service';
import { ExpiredWorkoutPhotosService } from './expired-workout-photos.service';

describe('Expired workout photos', () => {
  const paths = [{ path: 'user/old-session/photo.jpg' }];
  const list = jest.fn();
  const remove = jest.fn();
  const acknowledge = jest.fn();
  const storage = jest.fn(() => ({ remove }));
  const db = { from: jest.fn(() => ({ select: () => ({ order: () => ({ limit: list }) }),
    delete: () => ({ in: acknowledge }) })), storage: { from: storage } };
  let worker: ExpiredWorkoutPhotosService;
  beforeEach(() => {
    jest.clearAllMocks(); list.mockResolvedValue({ data: paths, error: null });
    remove.mockResolvedValue({ error: null }); acknowledge.mockResolvedValue({ error: null });
    worker = new ExpiredWorkoutPhotosService({ serviceClient: db } as unknown as SupabaseService);
  });
  it('acknowledges a path only after Storage confirms deletion', async () => {
    await worker.clean();
    expect(storage).toHaveBeenCalledWith('progress-photos');
    expect(remove).toHaveBeenCalledWith(['user/old-session/photo.jpg']);
    expect(acknowledge).toHaveBeenCalledWith('path', ['user/old-session/photo.jpg']);
    expect(remove.mock.invocationCallOrder[0]).toBeLessThan(acknowledge.mock.invocationCallOrder[0]);
  });
  it('keeps failed photos queued and succeeds on a later retry', async () => {
    remove.mockResolvedValueOnce({ error: new Error('storage unavailable') });
    await worker.clean(); expect(acknowledge).not.toHaveBeenCalled();
    await worker.clean(); expect(acknowledge).toHaveBeenCalledTimes(1);
  });
  it('does not send empty storage deletes', async () => {
    list.mockResolvedValue({ data: [], error: null });
    await worker.clean(); expect(remove).not.toHaveBeenCalled(); expect(acknowledge).not.toHaveBeenCalled();
  });
});
