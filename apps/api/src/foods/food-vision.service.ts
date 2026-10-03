import { BadGatewayException, Injectable, ServiceUnavailableException, UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { FoodAnalysisMode, NutritionUnit } from '../domain/domain.types';

export interface FoodVisionResult {
  foodName: string;
  brandName: string | null;
  servingAmount: number;
  servingUnit: NutritionUnit;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  confidence: number;
  notes: string;
  visibleFoods: string[];
}

interface GeminiResponse {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  error?: { message?: string };
}

const UNITS: NutritionUnit[] = ['g', 'ml', 'oz', 'unidad', 'porcion'];
const numberInRange = (value: unknown, min: number, max: number): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;

const parseVisionResult = (raw: string): FoodVisionResult => {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new BadGatewayException('La IA devolvio una respuesta que no se pudo interpretar.');
  }
  if (!value || typeof value !== 'object') throw new BadGatewayException('La IA no identifico un alimento valido.');
  const item = value as Record<string, unknown>;
  if (item.evidenceFound === false) {
    throw new UnprocessableEntityException('No se distingue un alimento o una etiqueta nutricional. Toma otra foto con buena luz.');
  }
  if (typeof item.foodName !== 'string' || item.foodName.trim().length < 2
    || typeof item.servingUnit !== 'string' || !UNITS.includes(item.servingUnit as NutritionUnit)
    || !numberInRange(item.servingAmount, 0.01, 100000)
    || !numberInRange(item.calories, 0, 100000)
    || !numberInRange(item.protein, 0, 10000)
    || !numberInRange(item.carbs, 0, 10000)
    || !numberInRange(item.fat, 0, 10000)
    || !numberInRange(item.confidence, 0, 1)
    || !Array.isArray(item.visibleFoods)
    || item.visibleFoods.some((name) => typeof name !== 'string' || name.trim().length < 2)) {
    throw new BadGatewayException('La IA no entrego valores nutricionales validos.');
  }
  if (item.visibleFoods.length === 0 || item.confidence < 0.35) {
    throw new UnprocessableEntityException('No se pudo reconocer el alimento con suficiente claridad. Toma otra foto.');
  }
  return {
    foodName: item.foodName.trim().slice(0, 120),
    brandName: typeof item.brandName === 'string' && item.brandName.trim() ? item.brandName.trim().slice(0, 120) : null,
    servingAmount: item.servingAmount,
    servingUnit: item.servingUnit as NutritionUnit,
    calories: item.calories,
    protein: item.protein,
    carbs: item.carbs,
    fat: item.fat,
    confidence: item.confidence,
    notes: typeof item.notes === 'string' ? item.notes.trim().slice(0, 500) : '',
    visibleFoods: item.visibleFoods.slice(0, 12).map((name: string) => name.trim().slice(0, 80)),
  };
};

@Injectable()
export class FoodVisionService {
  constructor(private readonly config: ConfigService) {}

  async analyze(image: Buffer, mimeType: string, mode: FoodAnalysisMode): Promise<FoodVisionResult> {
    const apiKey = this.config.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      throw new ServiceUnavailableException('El analisis de imagenes no esta configurado. Completa el alimento manualmente.');
    }
    const model = this.config.get<string>('GEMINI_MODEL') ?? 'gemini-2.5-flash';
    const prompt = mode === 'nutrition_label'
      ? 'Lee solo la tabla nutricional visible y el nombre/marca legibles. Usa exactamente la porcion indicada. Si no hay tabla legible, evidenceFound=false. No inventes datos faltantes.'
      : 'Identifica todos los alimentos realmente visibles, incluso si no son comunes o no estan en un catalogo. Escribe sus nombres en visibleFoods. Si es un plato mixto, nombra el plato e identifica cada componente visible; estima la porcion total comestible y los macros para esa misma porcion. No afirmes ingredientes ocultos ni marcas no legibles. Si no hay alimento visible o la foto es demasiado ambigua, evidenceFound=false.';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 55_000);
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          contents: [{ parts: [
            { inlineData: { mimeType, data: image.toString('base64') } },
            { text: `${prompt} Responde en espanol y solo JSON. evidenceFound debe reflejar evidencia visual, no una suposicion. visibleFoods debe enumerar lo reconocible. Usa 0 para un macro solo si realmente corresponde; si no puedes estimar valores con sentido, marca evidenceFound=false. confidence de 0 a 1 debe bajar para porciones inciertas. Indica en notes las incertidumbres de preparacion, salsas y tamano. No uses el catalogo de la app como limite de reconocimiento.` },
          ] }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.1,
            responseSchema: {
              type: 'OBJECT',
              properties: {
                foodName: { type: 'STRING' }, brandName: { type: 'STRING', nullable: true },
                servingAmount: { type: 'NUMBER' }, servingUnit: { type: 'STRING', enum: UNITS },
                calories: { type: 'NUMBER' }, protein: { type: 'NUMBER' }, carbs: { type: 'NUMBER' }, fat: { type: 'NUMBER' },
                confidence: { type: 'NUMBER' }, notes: { type: 'STRING' },
                evidenceFound: { type: 'BOOLEAN' },
                visibleFoods: { type: 'ARRAY', items: { type: 'STRING' } },
              },
              required: ['foodName', 'servingAmount', 'servingUnit', 'calories', 'protein', 'carbs', 'fat', 'confidence', 'notes', 'evidenceFound', 'visibleFoods'],
            },
          },
        }),
      });
      const payload = await response.json() as GeminiResponse;
      if (!response.ok) throw new BadGatewayException(payload.error?.message ?? 'El proveedor de IA rechazo el analisis.');
      const text = payload.candidates?.[0]?.content?.parts?.find((part) => part.text)?.text;
      if (!text) throw new BadGatewayException('La IA no devolvio un resultado.');
      return parseVisionResult(text);
    } catch (error: unknown) {
      if (error instanceof BadGatewayException || error instanceof UnprocessableEntityException) throw error;
      if (error instanceof Error && error.name === 'AbortError') {
        throw new ServiceUnavailableException('El analisis de imagen tardo demasiado. Intenta nuevamente.');
      }
      throw new BadGatewayException('No se pudo contactar al proveedor de analisis de imagenes.');
    } finally {
      clearTimeout(timeout);
    }
  }
}
