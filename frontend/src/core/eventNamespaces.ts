import type { GameEvent } from './types';

export const BR_IDS = new Set([
  'laenderfinanzausgleich', 'landtagswahl', 'kohl_eskaliert',
  'sprecher_wechsel', 'bundesrat_initiative', 'foederalismusgipfel',
]);

export const KOMMUNAL_IDS = new Set([
  'kommunal_klima_initiative', 'kommunal_sozial_initiative', 'kommunal_sicherheit_initiative',
]);

export const VORSTUFEN_IDS = new Set([
  'vorstufe_kommunal_erfolg', 'vorstufe_laender_erfolg',
]);

export const CHAR_IDS = new Set([
  'fm_ultimatum', 'braun_ultimatum', 'wolf_ultimatum', 'kern_ultimatum',
  'kanzler_ultimatum', 'kohl_bundesrat_sabotage', 'wm_ultimatum',
  'am_ultimatum', 'gm_ultimatum', 'bm_ultimatum',
  'koalitionsbruch', 'koalitionskrise_ultimatum',
  'lehmann_defizit_start', 'haushaltskrise',
]);

export type EventNamespace = 'events' | 'charEvents' | 'bundesratEvents' | 'kommunalEvents' | 'vorstufenEvents';

export function getEventNamespace(event: GameEvent): EventNamespace {
  if (event.charId || CHAR_IDS.has(event.id)) return 'charEvents';
  if (BR_IDS.has(event.id)) return 'bundesratEvents';
  if (KOMMUNAL_IDS.has(event.id)) return 'kommunalEvents';
  if (VORSTUFEN_IDS.has(event.id)) return 'vorstufenEvents';
  return 'events';
}
