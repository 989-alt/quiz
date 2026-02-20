export type Mode = 'free' | 'mandala';

export type Difficulty = 'easy' | 'medium' | 'hard';

export type MandalaPreset =
  | 'cosmos'
  | 'nature'
  | 'flower'
  | 'snow'
  | 'ocean'
  | 'butterfly'
  | 'star'
  | 'leaf';

export const MANDALA_PRESET_LABELS: Record<MandalaPreset, string> = {
  cosmos: '우주',
  nature: '자연',
  flower: '꽃',
  snow: '눈',
  ocean: '바다',
  butterfly: '나비',
  star: '별',
  leaf: '나뭇잎',
};

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: '하 (쉬움)',
  medium: '중 (보통)',
  hard: '상 (어려움)',
};

export interface GenerationConfig {
  mode: Mode;
  topic: string;
  mandalaPreset: MandalaPreset;
  difficulty: Difficulty;
  gridN: number;
  gridM: number;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'warning' | 'error';
  message: string;
}
