export interface WeightEntry {
  measured_on: string;
  weight: number;
  recorded_at: string;
}

export interface WeightReport {
  currentWeight: number | null;
  targetWeight: number | null;
  goal: 'bajar' | 'mantener' | 'subir' | null;
  targetCalories?: number | null;
  latest: WeightEntry | null;
  weeklyChange: number | null;
  comparisonDate: string | null;
  items: WeightEntry[];
  nextCursor: string | null;
}
