import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { FoodsService } from '../foods/foods.service';
import { SupabaseRepository } from '../supabase/supabase.repository';
import { NutritionService } from './nutrition.service';

const repositoryMock = {
  getProfile: jest.fn(),
  getFoodLogs: jest.fn(),
  insertFoodLog: jest.fn(),
  deleteFoodLogForUser: jest.fn(),
};

describe('NutritionService', () => {
  let service: NutritionService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        NutritionService,
        FoodsService,
        { provide: SupabaseRepository, useValue: repositoryMock },
      ],
    }).compile();

    service = module.get(NutritionService);
    jest.clearAllMocks();
  });

  it('rejects unknown food', async () => {
    await expect(service.createFoodLog('u1', {
      date: '2026-06-04',
      mealType: 'snack',
      foodId: 'missing',
      amount: 1,
      unit: 'unidad',
    })).rejects.toThrow(NotFoundException);
  });

  it('calculates and stores a food log', async () => {
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

  it('rejects deleting another user log', async () => {
    repositoryMock.deleteFoodLogForUser.mockResolvedValue(false);

    await expect(service.deleteFoodLog('u1', 'log1')).rejects.toThrow(NotFoundException);
  });
});
