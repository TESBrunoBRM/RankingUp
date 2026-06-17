import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { SupabaseService } from '../supabase/supabase.service';
import { SupabaseAuthGuard } from './supabase-auth.guard';

const createContext = (authorization?: string): ExecutionContext => ({
  switchToHttp: () => ({
    getRequest: () => ({ headers: { authorization } }),
  }),
} as ExecutionContext);

describe('SupabaseAuthGuard', () => {
  let guard: SupabaseAuthGuard;
  const supabaseServiceMock = { getUserFromToken: jest.fn() };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        SupabaseAuthGuard,
        { provide: SupabaseService, useValue: supabaseServiceMock },
      ],
    }).compile();

    guard = module.get(SupabaseAuthGuard);
    jest.clearAllMocks();
  });

  it('rejects missing token', async () => {
    await expect(guard.canActivate(createContext())).rejects.toThrow(UnauthorizedException);
  });

  it('rejects invalid token', async () => {
    supabaseServiceMock.getUserFromToken.mockResolvedValue(null);

    await expect(guard.canActivate(createContext('Bearer bad-token'))).rejects.toThrow(UnauthorizedException);
  });

  it('accepts valid token', async () => {
    supabaseServiceMock.getUserFromToken.mockResolvedValue({ id: 'u1', email: 'user@test.com' });

    await expect(guard.canActivate(createContext('Bearer good-token'))).resolves.toBe(true);
  });
});
