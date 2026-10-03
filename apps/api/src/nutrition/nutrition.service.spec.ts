import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { FoodsService } from '../foods/foods.service';
import { SupabaseRepository } from '../supabase/supabase.repository';
import { NutritionService } from './nutrition.service';

const repositoryMock = {
  getProfile: jest.fn(),
  getFoodLogs: jest.fn(),
  insertFoodLog: jest.fn(),
  deleteFoodLogForUser: jest.fn(),
  getWaterLogs: jest.fn(),
  insertWaterLog: jest.fn(),
  deleteWaterLogForUser: jest.fn(),
};

const foodsServiceMock = { getFood: jest.fn() };

describe('NutritionService', () => {
  let service: NutritionService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        NutritionService,
        { provide: FoodsService, useValue: foodsServiceMock },
        { provide: SupabaseRepository, useValue: repositoryMock },
      ],
    }).compile();

    service = module.get(NutritionService);
    jest.clearAllMocks();
  });

  it('rejects unknown food', async () => {
    foodsServiceMock.getFood.mockResolvedValue(null);
    await expect(service.createFoodLog('u1', {
      date: '2026-06-04',
      mealType: 'snack',
      foodId: 'missing',
      amount: 1,
      unit: 'unidad',
    })).rejects.toThrow(NotFoundException);
  });

  it('calculates and stores a food log', async () => {
    foodsServiceMock.getFood.mockResolvedValue({
      food_id: 'demo-apple', food_name: 'Manzana', food_description: '', source: 'local',
      serving: { amount: 100, unit: 'g', calories: 52, protein: 0.3, carbs: 14, fat: 0.2, description: 'Por 100 g', isPer100: true },
    });
    repositoryMock.insertFoodLog.mockImplementation((input) => Promise.resolve({ id: 'log1', ...input }));

    const result = await service.createFoodLog('u1', {
      date: '2026-06-04',
      mealType: 'snack',
      foodId: 'demo-apple',
      amount: 100,
      unit: 'g',
    });

    expect(repositoryMock.insertFoodLog).toHaveBeenCalledWith(expect.objectContaining({
      user_id: 'u1',
      food_name: 'Manzana',
      calories: 52,
    }));
    expect(result.log.id).toBe('log1');
  });

  it('uses user-corrected scan macros when saving the log', async () => {
    foodsServiceMock.getFood.mockResolvedValue({
      food_id: 'scan-own', food_name: 'Plato', food_description: '', source: 'ai',
      serving: { amount: 250, unit: 'g', calories: 400, protein: 20, carbs: 40, fat: 15, description: 'Escaneado', isPer100: false },
    });
    repositoryMock.insertFoodLog.mockImplementation((input) => Promise.resolve(input));
    await service.createFoodLog('u1', { date: '2026-10-02', mealType: 'almuerzo', foodId: 'scan-own', amount: 250, unit: 'g',
      correction: { foodName: 'Guiso de lentejas', calories: 360, protein: 24, carbs: 50, fat: 9 },
    });
    expect(foodsServiceMock.getFood).toHaveBeenCalledWith('scan-own', 'u1');
    expect(repositoryMock.insertFoodLog).toHaveBeenCalledWith(expect.objectContaining({ food_name: 'Guiso de lentejas', calories: 360 }));
  });

  it('does not allow nutrition overrides for shared catalog foods', async () => {
    foodsServiceMock.getFood.mockResolvedValue({ food_id: 'demo-apple', source: 'local' });
    await expect(service.createFoodLog('u1', { date: '2026-10-02', mealType: 'snack', foodId: 'demo-apple', amount: 100, unit: 'g',
      correction: { foodName: 'Alterado', calories: 1, protein: 0, carbs: 0, fat: 0 },
    })).rejects.toThrow(BadRequestException);
  });

  it('rejects deleting another user log', async () => {
    repositoryMock.deleteFoodLogForUser.mockResolvedValue(false);

    await expect(service.deleteFoodLog('u1', 'log1')).rejects.toThrow(NotFoundException);
  });

  it('includes the hydration summary with the daily nutrition data', async () => {
    repositoryMock.getProfile.mockResolvedValue({ target_calories: 2000 });
    repositoryMock.getFoodLogs.mockResolvedValue([]);
    repositoryMock.getWaterLogs.mockResolvedValue([
      { id: 'w1', user_id: 'u1', log_date: '2026-09-21', amount_ml: 250, created_at: '2026-09-21T10:00:00Z' },
      { id: 'w2', user_id: 'u1', log_date: '2026-09-21', amount_ml: 500, created_at: '2026-09-21T11:00:00Z' },
    ]);

    const result = await service.getDailySummary('u1', '2026-09-21');

    expect(result.water.totalMl).toBe(750);
    expect(result.water.targetMl).toBe(2750);
    expect(result.water.glasses).toBe(3);
  });

  it('adds and removes water only through ownership-aware repository methods', async () => {
    repositoryMock.insertWaterLog.mockResolvedValue({ id: 'w1', amount_ml: 250 });
    await expect(service.createWaterLog('u1', { date: '2026-09-21', amountMl: 250 }))
      .resolves.toEqual({ log: { id: 'w1', amount_ml: 250 } });
    expect(repositoryMock.insertWaterLog).toHaveBeenCalledWith('u1', '2026-09-21', 250);

    repositoryMock.deleteWaterLogForUser.mockResolvedValue(false);
    await expect(service.deleteWaterLog('u1', 'w-other')).rejects.toThrow(NotFoundException);
  });
});
