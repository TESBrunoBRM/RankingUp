import { BadGatewayException, Injectable, ServiceUnavailableException } from '@nestjs/common';
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
  if (typeof item.foodName !== 'string' || item.foodName.trim().length < 2
    || typeof item.servingUnit !== 'string' || !UNITS.includes(item.servingUnit as NutritionUnit)
    || !numberInRange(item.servingAmount, 0.01, 100000)
    || !numberInRange(item.calories, 0, 100000)
    || !numberInRange(item.protein, 0, 10000)
    || !numberInRange(item.carbs, 0, 10000)
    || !numberInRange(item.fat, 0, 10000)
    || !numberInRange(item.confidence, 0, 1)) {
    throw new BadGatewayException('La IA no entrego valores nutricionales validos.');
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
      ? 'Lee la tabla nutricional. Devuelve los valores de una porcion indicada en la etiqueta; no inventes una marca que no sea visible.'
      : 'Identifica la comida y estima la porcion visible y sus macros. Si hay varios componentes, devuelve el plato completo como un alimento.';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25_000);
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          contents: [{ parts: [
            { inlineData: { mimeType, data: image.toString('base64') } },
            { text: `${prompt} Responde solo con JSON. Los valores son una estimacion y deben incluir un nivel de confianza entre 0 y 1.` },
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
              },
              required: ['foodName', 'servingAmount', 'servingUnit', 'calories', 'protein', 'carbs', 'fat', 'confidence', 'notes'],
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
      if (error instanceof BadGatewayException) throw error;
      if (error instanceof Error && error.name === 'AbortError') {
        throw new ServiceUnavailableException('El analisis de imagen tardo demasiado. Intenta nuevamente.');
      }
      throw new BadGatewayException('No se pudo contactar al proveedor de analisis de imagenes.');
    } finally {
      clearTimeout(timeout);
    }
  }
}
