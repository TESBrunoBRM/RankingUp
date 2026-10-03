import { ConfigService } from '@nestjs/config';
import { FoodDataCentralService } from './food-data-central.service';

describe('FoodDataCentralService', () => {
  const originalFetch = global.fetch;
  afterEach(() => { global.fetch = originalFetch; });

  it('maps complete USDA nutrient rows and excludes incomplete foods', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ foods: [
      { fdcId: 172421, description: 'Lentils cooked', dataType: 'SR Legacy', foodNutrients: [
        { nutrientId: 1008, value: 116 }, { nutrientId: 1003, value: 9.02 },
        { nutrientId: 1005, value: 20.1 }, { nutrientId: 1004, value: 0.38 },
      ] },
      { fdcId: 1, description: 'Incomplete', dataType: 'SR Legacy', foodNutrients: [] },
    ] }) } as Response);
    const service = new FoodDataCentralService({ get: () => 'test-key' } as unknown as ConfigService);
    const result = await service.search('lentejas');
    expect(result).toEqual([expect.objectContaining({ food_id: 'fdc-172421', source: 'usda',
      serving: expect.objectContaining({ calories: 116, protein: 9.02, carbs: 20.1, fat: 0.38 }) })]);
    const request = (global.fetch as jest.Mock).mock.calls[0][1];
    expect(JSON.parse(request.body).query).toBe('lentils cooked');
    await expect(service.getFood('fdc-172421')).resolves.toEqual(result[0]);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('keeps the local catalog usable without a USDA key', async () => {
    global.fetch = jest.fn();
    const service = new FoodDataCentralService({ get: () => undefined } as unknown as ConfigService);
    await expect(service.search('quinoa')).resolves.toEqual([]);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
