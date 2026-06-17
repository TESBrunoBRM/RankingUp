import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('returns a deploy health payload', () => {
    expect(new HealthController().getHealth()).toEqual({
      status: 'ok',
      service: 'rankingup-api',
    });
  });
});
