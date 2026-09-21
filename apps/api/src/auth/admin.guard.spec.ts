import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { AdminGuard } from './admin.guard';

const contextForRole = (role: string | null): ExecutionContext => ({
  switchToHttp: () => ({ getRequest: () => ({ user: { id: 'u1', email: null, role } }) }),
} as ExecutionContext);

describe('AdminGuard', () => {
  const guard = new AdminGuard();

  it('allows only a role stored in trusted app metadata', () => {
    expect(guard.canActivate(contextForRole('admin'))).toBe(true);
  });

  it.each([null, 'user', 'moderator'])('rejects non-admin role %s', (role) => {
    expect(() => guard.canActivate(contextForRole(role))).toThrow(ForbiddenException);
  });
});
