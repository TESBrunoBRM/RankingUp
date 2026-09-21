import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { SupabaseRepository } from '../supabase/supabase.repository';
import { SupabaseService } from '../supabase/supabase.service';
import { FoodVisionService } from './food-vision.service';
import { FoodsService } from './foods.service';

const approvedFood = {
  id: 'f1', submitted_by: 'u2', scan_analysis_id: null, status: 'approved' as const,
  food_name: 'Yogur natural', brand_name: 'Ranking', barcode: null,
  serving_amount: 100, serving_unit: 'g' as const, calories: 80, protein: 8, carbs: 6, fat: 2,
  image_path: 'u2/image.jpg', source_mode: 'nutrition_label' as const, submitter_notes: null,
  reviewed_by: 'admin', reviewed_at: '2026-09-21T00:00:00Z', review_note: null,
  created_at: '2026-09-21T00:00:00Z', updated_at: '2026-09-21T00:00:00Z',
};

describe('FoodsService', () => {
  const repository = {
    searchApprovedFoodSubmissions: jest.fn(), getApprovedFoodSubmission: jest.fn(),
    getFoodScanAnalysisForUser: jest.fn(), insertFoodScanAnalysis: jest.fn(),
    insertFoodSubmission: jest.fn(), getFoodSubmissionsForUser: jest.fn(),
    getFoodSubmissionsByStatus: jest.fn(), reviewFoodSubmission: jest.fn(),
  };
  const storage = { createSignedUploadUrl: jest.fn(), download: jest.fn(), info: jest.fn() };
  const supabase = { serviceClient: { storage: { from: jest.fn(() => storage) } } };
  const vision = { analyze: jest.fn() };
  let service: FoodsService;

  beforeEach(() => {
    jest.clearAllMocks();
    repository.searchApprovedFoodSubmissions.mockResolvedValue([]);
    service = new FoodsService(
      repository as unknown as SupabaseRepository,
      supabase as unknown as SupabaseService,
      vision as unknown as FoodVisionService,
    );
  });

  it('places approved community foods in search results', async () => {
    repository.searchApprovedFoodSubmissions.mockResolvedValue([approvedFood]);
    const result = await service.search('yogur');
    expect(result[0]).toEqual(expect.objectContaining({ food_id: 'community-f1', source: 'community', food_name: 'Yogur natural' }));
  });

  it('rejects an image path owned by another user before storage access', async () => {
    await expect(service.analyzeImage('u1', { imagePath: 'u2/image.jpg', mode: 'meal' }))
      .rejects.toThrow(ForbiddenException);
    expect(storage.download).not.toHaveBeenCalled();
  });

  it('persists a validated image analysis and returns a registrable food id', async () => {
    storage.download.mockResolvedValue({ data: new Blob([Buffer.from('image')]), error: null });
    vision.analyze.mockResolvedValue({
      foodName: 'Arroz con pollo', brandName: null, servingAmount: 350, servingUnit: 'g',
      calories: 540, protein: 32, carbs: 65, fat: 16, confidence: 0.8, notes: 'Estimado',
    });
    repository.insertFoodScanAnalysis.mockImplementation(async (input) => ({
      id: 'scan1', created_at: '', ...input,
    }));

    const result = await service.analyzeImage('u1', { imagePath: 'u1/image.jpg', mode: 'meal' });

    expect(result.food).toEqual(expect.objectContaining({ food_id: 'scan-scan1', source: 'ai' }));
    expect(repository.insertFoodScanAnalysis).toHaveBeenCalledWith(expect.objectContaining({ user_id: 'u1', calories: 540 }));
  });

  it('requires a server-side AI analysis when the food has no label', async () => {
    await expect(service.createSubmission('u1', {
      foodName: 'Plato casero', servingAmount: 1, servingUnit: 'porcion', calories: 400,
      protein: 20, carbs: 40, fat: 15, imagePath: 'u1/image.jpg', sourceMode: 'ai_estimate',
    })).rejects.toThrow(BadRequestException);
    expect(storage.info).not.toHaveBeenCalled();
  });

  it('does not review an already processed or missing submission', async () => {
    repository.reviewFoodSubmission.mockResolvedValue(null);
    await expect(service.reviewSubmission('admin', 'missing', { status: 'approved' }))
      .rejects.toThrow(NotFoundException);
  });
});
