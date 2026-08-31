import type { FitnessNewsItem, HomeMessage } from './home-content.types';

export const HOME_MESSAGES: HomeMessage[] = [
  { id: 'consistency', kind: 'motivacion', text: 'LA CONSTANCIA SUPERA A LA MOTIVACION.' },
  { id: 'rest', kind: 'sabias-que', text: '¿SABIAS QUE...? EL DESCANSO TAMBIEN CONSTRUYE MUSCULO.' },
  { id: 'small-progress', kind: 'motivacion', text: 'UNA REPETICION MAS TAMBIEN ES PROGRESO.' },
  { id: 'strength', kind: 'sabias-que', text: '¿SABIAS QUE...? ENTRENAR FUERZA AYUDA A CUIDAR HUESOS Y MUSCULOS.' },
  { id: 'show-up', kind: 'motivacion', text: 'NO TIENES QUE SER PERFECTO. TIENES QUE PRESENTARTE.' },
  { id: 'technique', kind: 'sabias-que', text: '¿SABIAS QUE...? UNA TECNICA SOLIDA VA ANTES QUE SUBIR EL PESO.' },
];

export const FALLBACK_NEWS: FitnessNewsItem[] = [
  {
    id: 'acsm-trends',
    title: 'Las tendencias que estan definiendo el entrenamiento y el bienestar',
    source: 'ACSM',
    publishedAt: '2026-01-01T00:00:00.000Z',
    url: 'https://acsm.org/education-resources/trending-topics-resources/acsm-fitness-trends/',
  },
  {
    id: 'who-physical-activity',
    title: 'Actividad fisica: beneficios, recomendaciones y datos clave',
    source: 'OMS',
    publishedAt: '2024-06-26T00:00:00.000Z',
    url: 'https://www.who.int/news-room/fact-sheets/detail/physical-activity',
  },
  {
    id: 'acsm-research',
    title: 'Nuevas investigaciones sobre ejercicio, salud y rendimiento',
    source: 'ACSM',
    publishedAt: '2026-05-07T00:00:00.000Z',
    url: 'https://acsm.org/category/news-release/',
  },
];
