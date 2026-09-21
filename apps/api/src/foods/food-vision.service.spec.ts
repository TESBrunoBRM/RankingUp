import { BadGatewayException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FoodVisionService } from './food-vision.service';

describe('FoodVisionService', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('fails clearly when the backend provider is not configured', async () => {
    const service = new FoodVisionService({ get: jest.fn().mockReturnValue(undefined) } as unknown as ConfigService);
    await expect(service.analyze(Buffer.from('image'), 'image/jpeg', 'meal'))
      .rejects.toThrow(ServiceUnavailableException);
  });

  it('returns a validated typed analysis', async () => {
    const config = { get: jest.fn((key: string) => key === 'GEMINI_API_KEY' ? 'secret' : 'test-model') };
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify({
        foodName: 'Ensalada con pollo', brandName: null, servingAmount: 320, servingUnit: 'g',
        calories: 410, protein: 35, carbs: 28, fat: 17, confidence: 0.82, notes: 'Porcion estimada',
      }) }] } }] }),
    } as Response);
    const service = new FoodVisionService(config as unknown as ConfigService);

    await expect(service.analyze(Buffer.from('image'), 'image/jpeg', 'meal')).resolves.toEqual(expect.objectContaining({
      foodName: 'Ensalada con pollo', calories: 410, confidence: 0.82,
    }));
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('test-model'), expect.objectContaining({ method: 'POST' }));
  });

  it('rejects malformed nutrition output from the provider', async () => {
    const config = { get: jest.fn((key: string) => key === 'GEMINI_API_KEY' ? 'secret' : 'test-model') };
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ candidates: [{ content: { parts: [{ text: '{"foodName":"x"}' }] } }] }),
    } as Response);
    const service = new FoodVisionService(config as unknown as ConfigService);

    await expect(service.analyze(Buffer.from('image'), 'image/jpeg', 'nutrition_label'))
      .rejects.toThrow(BadGatewayException);
  });
});
