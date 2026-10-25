import {
  BadRequestException,
  ConflictException,
  ExecutionContext,
  HttpException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { lastValueFrom, of, throwError } from 'rxjs';
import { AiCreditsInterceptor } from './ai-credits.interceptor';
import { BillingService } from './billing.service';

describe('AI credit boundary', () => {
  const billing = {
    mode: 'test',
    reserve: jest.fn(),
    finish: jest.fn(),
    exhausted: jest.fn(() => {
      throw new HttpException('Sin usos', 402);
    }),
  };
  const context = (id = 'same-request-123') =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({
          user: { id: 'u1' },
          path: '/v1/foods/analyze-image',
          body: { imagePath: 'u1/test.jpg' },
          header: () => id,
        }),
      }),
    }) as unknown as ExecutionContext;
  const handler = { handle: jest.fn(() => of({ result: true })) };
  let interceptor: AiCreditsInterceptor;
  beforeEach(() => {
    jest.clearAllMocks();
    billing.mode = 'test';
    billing.reserve.mockResolvedValue({ status: 'reserved' });
    billing.finish.mockResolvedValue(null);
    handler.handle.mockReturnValue(of({ result: true }));
    interceptor = new AiCreditsInterceptor(billing as unknown as BillingService);
  });
  it('charges a completed operation once and stores its response', async () => {
    await expect(lastValueFrom(interceptor.intercept(context(), handler))).resolves.toEqual({
      result: true,
    });
    expect(billing.reserve).toHaveBeenCalledWith('u1', 'same-request-123', expect.any(String));
    expect(billing.finish).toHaveBeenCalledWith('u1', 'same-request-123', true, { result: true });
  });
  it('returns a cached response without repeating provider calls or writes', async () => {
    billing.reserve.mockResolvedValue({ status: 'cached', response: { old: true } });
    await expect(lastValueFrom(interceptor.intercept(context(), handler))).resolves.toEqual({
      old: true,
    });
    expect(handler.handle).not.toHaveBeenCalled();
    expect(billing.finish).not.toHaveBeenCalled();
  });
  it('blocks an exhausted account before calling AI', async () => {
    billing.reserve.mockResolvedValue({ status: 'exhausted' });
    await expect(lastValueFrom(interceptor.intercept(context(), handler))).rejects.toMatchObject({
      status: 402,
    });
    expect(handler.handle).not.toHaveBeenCalled();
  });
  it('refunds when validation or the provider fails', async () => {
    handler.handle.mockReturnValue(throwError(() => new BadRequestException('Imagen inválida')));
    await expect(lastValueFrom(interceptor.intercept(context(), handler))).rejects.toMatchObject({
      status: 400,
    });
    expect(billing.finish).toHaveBeenCalledWith('u1', 'same-request-123', false);
  });
  it('keeps a reservation when recording an already persisted success fails', async () => {
    billing.finish.mockRejectedValue(new ServiceUnavailableException());
    await expect(lastValueFrom(interceptor.intercept(context(), handler))).rejects.toThrow(
      ServiceUnavailableException,
    );
    expect(billing.finish).toHaveBeenCalledTimes(1);
    expect(billing.finish.mock.calls[0][2]).toBe(true);
  });
  it.each(['pending', 'conflict', 'failed'])('does not repeat a %s operation', async (status) => {
    billing.reserve.mockResolvedValue({ status });
    await expect(lastValueFrom(interceptor.intercept(context(), handler))).rejects.toThrow(
      ConflictException,
    );
    expect(handler.handle).not.toHaveBeenCalled();
  });
  it('rejects invalid request identifiers without reserving', async () => {
    await expect(lastValueFrom(interceptor.intercept(context('bad'), handler))).rejects.toThrow(
      BadRequestException,
    );
    expect(billing.reserve).not.toHaveBeenCalled();
  });
  it('keeps commercial enforcement disabled before provider setup', async () => {
    billing.mode = 'disabled';
    await lastValueFrom(interceptor.intercept(context(), handler));
    expect(billing.reserve).not.toHaveBeenCalled();
  });
});
