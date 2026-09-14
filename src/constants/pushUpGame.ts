export type MonsterIconName =
  | 'bug-outline'
  | 'skull-outline'
  | 'shield-half-outline'
  | 'moon-outline'
  | 'flame-outline'
  | 'bonfire-outline';

export interface PushUpMonster {
  name: string;
  shortName: string;
  icon: MonsterIconName;
  maxHp: number;
  level: number;
  color: string;
}

export const PUSH_UP_VICTORY_TARGET = 100;
export const MINIGAME_XP_PER_REP = 0.4;
export const MINIGAME_COMPLETION_BONUS = 10;
export const MINIGAME_MIN_REWARDED_REPS = 10;

// Pagina del detector MediaPipe que se carga en el WebView.
export const MINIGAME_URL = 'https://tesbrunobrm.github.io/RankingUp/apps/api/public/minigame.html';
export const MINIGAME_ORIGIN = 'https://tesbrunobrm.github.io';
// Android expone los permisos del WebView con estos identificadores.
// Solo camara: la pagina no debe poder pedir microfono ni ubicacion.
export const ALLOWED_WEBVIEW_PERMISSIONS = ['android.webkit.resource.VIDEO_CAPTURE'];

export const PUSH_UP_MONSTERS: PushUpMonster[] = [
  { name: 'Explorador oscuro', shortName: 'Explorador', icon: 'bug-outline', maxHp: 8, level: 1, color: '#42D392' },
  { name: 'Guardian oseo', shortName: 'Guardian', icon: 'skull-outline', maxHp: 12, level: 2, color: '#B8C1CC' },
  { name: 'Bruto de acero', shortName: 'Bruto', icon: 'shield-half-outline', maxHp: 15, level: 3, color: '#FF9F0A' },
  { name: 'Hechicero umbrio', shortName: 'Hechicero', icon: 'moon-outline', maxHp: 18, level: 4, color: '#8B7CFF' },
  { name: 'Draconido de fuego', shortName: 'Draconido', icon: 'flame-outline', maxHp: 22, level: 5, color: '#FF496C' },
  { name: 'Senor del abismo', shortName: 'Jefe final', icon: 'bonfire-outline', maxHp: 25, level: 6, color: '#CCFF00' },
];
