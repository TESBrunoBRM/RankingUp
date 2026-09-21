import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { getFoodById, searchFoods } from '../domain/foods.catalog';
import type { FoodScanAnalysisRecord, FoodSearchResult, FoodSubmissionRecord } from '../domain/domain.types';
import { SupabaseRepository } from '../supabase/supabase.repository';
import { SupabaseService } from '../supabase/supabase.service';
import type { AnalyzeFoodImageDto, CreateFoodSubmissionDto, FoodImageUploadDto, ReviewFoodSubmissionDto } from './dto/foods.dto';
import { FoodVisionService } from './food-vision.service';

const mimeFromPath = (path: string): string => path.endsWith('.png')
  ? 'image/png'
  : path.endsWith('.webp') ? 'image/webp' : 'image/jpeg';

const description = (serving: FoodSearchResult['serving']): string =>
  `${serving.description} - ${Math.round(serving.calories)} kcal | Grasas: ${serving.fat}g | Carbs: ${serving.carbs}g | Proteina: ${serving.protein}g`;

const analysisToFood = (row: FoodScanAnalysisRecord): FoodSearchResult => {
  const serving = {
    amount: Number(row.serving_amount), unit: row.serving_unit,
    calories: Number(row.calories), protein: Number(row.protein), carbs: Number(row.carbs), fat: Number(row.fat),
    description: `Porcion analizada de ${Number(row.serving_amount)} ${row.serving_unit}`,
    isPer100: Number(row.serving_amount) === 100 && ['g', 'ml'].includes(row.serving_unit),
  };
  return { food_id: `scan-${row.id}`, food_name: row.food_name, brand_name: row.brand_name ?? undefined,
    food_description: description(serving), serving, source: 'ai' };
};

const submissionToFood = (row: FoodSubmissionRecord): FoodSearchResult => {
  const serving = {
    amount: Number(row.serving_amount), unit: row.serving_unit,
    calories: Number(row.calories), protein: Number(row.protein), carbs: Number(row.carbs), fat: Number(row.fat),
    description: `Por ${Number(row.serving_amount)} ${row.serving_unit}`,
    isPer100: Number(row.serving_amount) === 100 && ['g', 'ml'].includes(row.serving_unit),
  };
  return { food_id: `community-${row.id}`, food_name: row.food_name, brand_name: row.brand_name ?? undefined,
    food_description: description(serving), serving, source: 'community' };
};

@Injectable()
export class FoodsService {
  constructor(
    private readonly repository: SupabaseRepository,
    private readonly supabase: SupabaseService,
    private readonly vision: FoodVisionService,
  ) {}

  async search(query: string): Promise<FoodSearchResult[]> {
    const [local, community] = await Promise.all([
      Promise.resolve(searchFoods(query)),
      this.repository.searchApprovedFoodSubmissions(query),
    ]);
    return [...community.map(submissionToFood), ...local];
  }

  async getFood(foodId: string, userId?: string): Promise<FoodSearchResult | null> {
    const local = getFoodById(foodId);
    if (local) return local;
    if (foodId.startsWith('community-')) {
      const row = await this.repository.getApprovedFoodSubmission(foodId.slice('community-'.length));
      return row ? submissionToFood(row) : null;
    }
    if (foodId.startsWith('scan-') && userId) {
      const row = await this.repository.getFoodScanAnalysisForUser(foodId.slice('scan-'.length), userId);
      return row ? analysisToFood(row) : null;
    }
    return null;
  }

  async createImageUploadUrl(userId: string, dto: FoodImageUploadDto) {
    const ext = dto.contentType === 'image/png' ? 'png' : dto.contentType === 'image/webp' ? 'webp' : 'jpg';
    const path = `${userId}/${randomUUID()}.${ext}`;
    const { data, error } = await this.supabase.serviceClient.storage.from('food-evidence').createSignedUploadUrl(path);
    if (error || !data) throw new BadRequestException(error?.message ?? 'No se pudo preparar la subida.');
    return { uploadUrl: data.signedUrl, path, token: data.token };
  }

  async analyzeImage(userId: string, dto: AnalyzeFoodImageDto) {
    this.assertOwnedPath(userId, dto.imagePath);
    const storage = this.supabase.serviceClient.storage.from('food-evidence');
    const { data, error } = await storage.download(dto.imagePath);
    if (error || !data) throw new BadRequestException('La imagen no existe o no pudo descargarse.');
    const image = Buffer.from(await data.arrayBuffer());
    if (!image.length || image.length > 5 * 1024 * 1024) throw new BadRequestException('La imagen debe pesar entre 1 byte y 5 MB.');
    const analyzed = await this.vision.analyze(image, mimeFromPath(dto.imagePath), dto.mode);
    const row = await this.repository.insertFoodScanAnalysis({
      user_id: userId, image_path: dto.imagePath, mode: dto.mode,
      food_name: analyzed.foodName, brand_name: analyzed.brandName,
      serving_amount: analyzed.servingAmount, serving_unit: analyzed.servingUnit,
      calories: analyzed.calories, protein: analyzed.protein, carbs: analyzed.carbs, fat: analyzed.fat,
      confidence: analyzed.confidence, notes: analyzed.notes || null,
    });
    return {
      analysisId: row.id,
      imagePath: row.image_path,
      confidence: Number(row.confidence),
      notes: row.notes,
      disclaimer: 'Estimacion orientativa. Revisa la porcion y la etiqueta antes de guardar.',
      food: analysisToFood(row),
    };
  }

  async createSubmission(userId: string, dto: CreateFoodSubmissionDto) {
    this.assertOwnedPath(userId, dto.imagePath);
    if (dto.sourceMode === 'ai_estimate' && !dto.scanAnalysisId) {
      throw new BadRequestException('Los alimentos sin etiqueta requieren un analisis de IA valido.');
    }
    const { data: imageInfo, error: imageError } = await this.supabase.serviceClient.storage.from('food-evidence').info(dto.imagePath);
    if (imageError || !imageInfo) throw new BadRequestException('La foto de respaldo no existe.');
    if (dto.scanAnalysisId) {
      const scan = await this.repository.getFoodScanAnalysisForUser(dto.scanAnalysisId, userId);
      if (!scan || scan.image_path !== dto.imagePath) throw new ForbiddenException('El analisis no pertenece a esta foto.');
      const expectedMode = dto.sourceMode === 'nutrition_label' ? 'nutrition_label' : 'meal';
      if (scan.mode !== expectedMode) throw new BadRequestException('El tipo de analisis no coincide con la evidencia enviada.');
    }
    const submission = await this.repository.insertFoodSubmission({
      submitted_by: userId,
      scan_analysis_id: dto.scanAnalysisId ?? null,
      food_name: dto.foodName.trim(), brand_name: dto.brandName?.trim() || null,
      barcode: dto.barcode?.trim() || null,
      serving_amount: dto.servingAmount, serving_unit: dto.servingUnit,
      calories: dto.calories, protein: dto.protein, carbs: dto.carbs, fat: dto.fat,
      image_path: dto.imagePath, source_mode: dto.sourceMode,
      submitter_notes: dto.submitterNotes?.trim() || null,
    });
    return { submission };
  }

  listOwnSubmissions(userId: string) {
    return this.repository.getFoodSubmissionsForUser(userId);
  }

  listForReview(status: 'pending' | 'approved' | 'rejected') {
    return this.repository.getFoodSubmissionsByStatus(status);
  }

  async reviewSubmission(adminId: string, id: string, dto: ReviewFoodSubmissionDto) {
    const submission = await this.repository.reviewFoodSubmission(id, adminId, dto.status, dto.reviewNote?.trim() || null);
    if (!submission) throw new NotFoundException('El aporte no existe o ya fue revisado.');
    return { submission };
  }

  private assertOwnedPath(userId: string, path: string): void {
    if (!path.startsWith(`${userId}/`) || path.includes('..')) {
      throw new ForbiddenException('La imagen no pertenece a este usuario.');
    }
  }
}
