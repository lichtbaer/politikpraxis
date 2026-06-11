/**
 * Offline-Fallback-Content: macht das Spiel ohne erreichbares Backend startbar.
 *
 * Kuratierter Mindest-Content (Kabinett, Kerngesetze, Events, BR-Fraktionen).
 * Gesetze/Charaktere/Events kommen aus der Balance-Simulation
 * (core/simulation/testContent.ts), die die echten DB-Inhalte spiegelt und
 * deren Spielbarkeit über 48 Monate per Monte-Carlo abgesichert ist.
 */
import type { BundesratFraktion } from '../../core/types';
import { SIM_CONTENT_WITH_UNLOCK_EVENTS } from '../../core/simulation/testContent';

export const FALLBACK_CHARS = SIM_CONTENT_WITH_UNLOCK_EVENTS.characters;
export const FALLBACK_LAWS = SIM_CONTENT_WITH_UNLOCK_EVENTS.laws;
export const FALLBACK_EVENTS = SIM_CONTENT_WITH_UNLOCK_EVENTS.events;

/** 4 Bundesrat-Fraktionen über alle 16 Länder (Stimmgewichte: DEFAULT_BUNDESRAT) */
export const FALLBACK_BUNDESRAT_FRAKTIONEN: BundesratFraktion[] = [
  {
    id: 'koalitionstreue',
    name: 'Koalitionstreue Länder',
    sprecher: {
      name: 'Claudia Bergmann', partei: 'SPD', land: 'NW', initials: 'CB',
      color: '#c0504d', bio: 'Verlässliche Partnerin der Bundesregierung.',
    },
    laender: ['NW', 'NI', 'HH', 'HB', 'SH'],
    basisBereitschaft: 70,
    beziehung: 60,
    tradeoffPool: [
      { id: 'kt_finanzhilfe', label: 'Kommunale Finanzhilfe', desc: 'Bund beteiligt sich an kommunalen Altlasten.', effect: { hh: -0.2 }, charMood: {} },
    ],
  },
  {
    id: 'pragmatische_mitte',
    name: 'Pragmatische Mitte',
    sprecher: {
      name: 'Thomas Becker', partei: 'SPD', land: 'RP', initials: 'TB',
      color: '#9bbb59', bio: 'Sucht den Ausgleich zwischen Bund und Ländern.',
    },
    laender: ['RP', 'SL', 'BE', 'HE'],
    basisBereitschaft: 55,
    beziehung: 50,
    tradeoffPool: [
      { id: 'pm_strukturfonds', label: 'Strukturfonds', desc: 'Mittel für Strukturwandelregionen.', effect: { hh: -0.15 }, charMood: {} },
    ],
  },
  {
    id: 'konservativer_block',
    name: 'Konservativer Block',
    sprecher: {
      name: 'Edmund Huber', partei: 'CSU', land: 'BY', initials: 'EH',
      color: '#4f81bd', bio: 'Hart in der Sache, offen für Tauschgeschäfte.',
    },
    laender: ['BY', 'BW', 'ST'],
    basisBereitschaft: 40,
    beziehung: 45,
    tradeoffPool: [
      { id: 'kb_laenderanteil', label: 'Höherer Länderanteil', desc: 'Umsatzsteuer-Anteil der Länder steigt.', effect: { hh: -0.25 }, charMood: {} },
    ],
  },
  {
    id: 'ostblock',
    name: 'Ostdeutsche Länder',
    sprecher: {
      name: 'Matthias Kohl', partei: 'CDU', land: 'SN', initials: 'MK',
      color: '#8064a2', bio: 'Pocht auf Strukturhilfen für den Osten.',
    },
    laender: ['BB', 'SN', 'TH', 'MV'],
    basisBereitschaft: 45,
    beziehung: 50,
    tradeoffPool: [
      { id: 'ob_strukturhilfe', label: 'Ost-Strukturhilfe', desc: 'Sonderprogramm für ostdeutsche Regionen.', effect: { hh: -0.2 }, charMood: {} },
    ],
  },
];
