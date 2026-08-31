import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  normalizeSearchTerm,
  toSpanishBodyPart,
  toSpanishEquipment,
  toSpanishMuscle,
  toSpanishTarget,
  translateSearchTerm,
} from '../domain/exercise-taxonomy';
import { SupabaseRepository, type ExerciseCatalogRow } from '../supabase/supabase.repository';
import type { SearchExercisesDto } from './dto/search-exercises.dto';

const DEFAULT_PAGE_SIZE = 30;
const MAX_PAGE_SIZE = 60;
const MAX_LOOKUP_NAMES = 50;

/**
 * Media (c) Gym visual. El dataset la publica a 180x180 y exige mantener la
 * atribucion. La base es configurable para poder servir una copia propia con
 * licencia en vez de tirar del repositorio original.
 */
const DEFAULT_MEDIA_BASE_URL =
  'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main';

export interface ExerciseSummary {
  id: string;
  name: string;
  bodyPart: string;
  bodyPartLabel: string;
  equipment: string;
  equipmentLabel: string;
  target: string;
  targetLabel: string;
  thumbnailUrl: string | null;
  gifUrl: string | null;
}

export interface ExerciseDetail extends ExerciseSummary {
  muscleGroupLabel: string;
  secondaryMuscleLabels: string[];
  instructions: string;
  steps: string[];
  attribution: string | null;
}

@Injectable()
export class ExercisesService {
  private facetsCache: Awaited<ReturnType<ExercisesService['loadFacets']>> | null = null;

  constructor(
    private readonly repository: SupabaseRepository,
    private readonly config: ConfigService,
  ) {}

  private get mediaBaseUrl(): string {
    return (this.config.get<string>('EXERCISE_MEDIA_BASE_URL') ?? DEFAULT_MEDIA_BASE_URL).replace(/\/+$/, '');
  }

  private toMediaUrl(path: string | null): string | null {
    return path ? `${this.mediaBaseUrl}/${path.replace(/^\/+/, '')}` : null;
  }

  /**
   * El texto va dentro de un filtro `like` de PostgREST, asi que fuera todo lo
   * que no sea alfanumerico: evita comodines y roturas del parser de filtros.
   */
  private sanitizeQuery(raw: string | undefined): string | undefined {
    if (!raw) return undefined;
    const translated = translateSearchTerm(raw);
    const cleaned = normalizeSearchTerm(translated).replace(/[^a-z0-9 -]/g, ' ').replace(/\s+/g, ' ').trim();
    return cleaned.length >= 2 ? cleaned : undefined;
  }

  private toSummary(row: ExerciseCatalogRow): ExerciseSummary {
    return {
      id: row.id,
      name: row.name,
      bodyPart: row.body_part ?? '',
      bodyPartLabel: toSpanishBodyPart(row.body_part),
      equipment: row.equipment ?? '',
      equipmentLabel: toSpanishEquipment(row.equipment),
      target: row.target ?? '',
      targetLabel: toSpanishTarget(row.target),
      thumbnailUrl: this.toMediaUrl(row.image_path),
      gifUrl: this.toMediaUrl(row.gif_path),
    };
  }

  async search(dto: SearchExercisesDto) {
    const page = dto.page ?? 1;
    const pageSize = Math.min(dto.pageSize ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);

    const { items, total } = await this.repository.searchExerciseCatalog({
      query: this.sanitizeQuery(dto.query),
      bodyPart: dto.bodyPart,
      equipment: dto.equipment,
      target: dto.target,
      offset: (page - 1) * pageSize,
      limit: pageSize,
    });

    return {
      items: items.map((row) => this.toSummary(row)),
      page,
      pageSize,
      total,
      hasMore: page * pageSize < total,
    };
  }

  async getById(id: string): Promise<ExerciseDetail> {
    const row = await this.repository.getExerciseCatalogEntry(id);
    if (!row) throw new NotFoundException('Ejercicio no encontrado.');
    return this.toDetail(row);
  }

  /**
   * workout_exercises.exercise_id guarda el nombre del ejercicio, no el id del
   * catalogo. Las pantallas de rutina lo usan para pintar la previsualizacion.
   */
  private toDetail(row: ExerciseCatalogRow): ExerciseDetail {
    return {
      ...this.toSummary(row),
      muscleGroupLabel: toSpanishMuscle(row.muscle_group),
      secondaryMuscleLabels: (row.secondary_muscles ?? []).map((muscle) => toSpanishMuscle(muscle)),
      instructions: row.instructions_es ?? row.instructions_en ?? '',
      steps: row.steps_es?.length ? row.steps_es : (row.steps_en ?? []),
      attribution: row.attribution,
    };
  }

  /**
   * Lookup por lote: las pantallas de rutina necesitan la ficha de todos sus
   * ejercicios a la vez, y pedirlas una a una era una peticion HTTP por ejercicio.
   */
  async getManyByNames(names: string[]): Promise<ExerciseDetail[]> {
    const cleaned = [...new Set(names.map((name) => name.trim()).filter(Boolean))].slice(0, MAX_LOOKUP_NAMES);
    if (cleaned.length === 0) return [];

    const rows = await this.repository.findExerciseCatalogEntriesByNames(cleaned);
    return rows.map((row) => this.toDetail(row));
  }

  async getByName(name: string): Promise<ExerciseDetail | null> {
    const cleaned = name.trim();
    if (!cleaned) return null;

    const row = await this.repository.findExerciseCatalogEntryByName(cleaned);
    return row ? this.toDetail(row) : null;
  }

  private async loadFacets() {
    const rows = await this.repository.getExerciseCatalogFacetRows();

    const tally = (pick: (row: (typeof rows)[number]) => string | null, label: (value: string) => string) => {
      const counts = new Map<string, number>();
      for (const row of rows) {
        const value = pick(row);
        if (value) counts.set(value, (counts.get(value) ?? 0) + 1);
      }
      return [...counts.entries()]
        .map(([value, count]) => ({ value, label: label(value), count }))
        .sort((a, b) => b.count - a.count);
    };

    return {
      bodyParts: tally((row) => row.body_part, toSpanishBodyPart),
      equipment: tally((row) => row.equipment, toSpanishEquipment),
      targets: tally((row) => row.target, toSpanishTarget),
      total: rows.length,
    };
  }

  async getFilters() {
    // El catalogo es estatico: se calcula una vez por proceso.
    this.facetsCache ??= await this.loadFacets();
    return this.facetsCache;
  }
}
