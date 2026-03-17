import type { ContentBundle, BundesratLand } from '../../core/types';
import { GRUENE } from './koalitionspartner';

/** 16 Bundesländer für Abstimmungsbalken (strukturelle Daten, nicht i18n) */
export const DEFAULT_BUNDESRAT: BundesratLand[] = [
  { id: 'BY', name: 'Bayern', mp: 'Edmund Huber', party: 'CSU', alignment: 'koalition', mood: 2, interests: ['Wirtschaft', 'EU-Skepsis'], votes: 6 },
  { id: 'NW', name: 'Nordrhein-Westfalen', mp: 'Claudia Bergmann', party: 'SPD', alignment: 'koalition', mood: 3, interests: ['Industrie', 'Kohleausstieg'], votes: 6 },
  { id: 'BW', name: 'Baden-Württemberg', mp: 'Friedrich Stein', party: 'Grüne', alignment: 'koalition', mood: 3, interests: ['Klimaschutz', 'Technologie'], votes: 6 },
  { id: 'NI', name: 'Niedersachsen', mp: 'Heike Brandt', party: 'SPD', alignment: 'koalition', mood: 3, interests: ['Landwirtschaft', 'Energie'], votes: 6 },
  { id: 'HE', name: 'Hessen', mp: 'Marcus Roth', party: 'CDU', alignment: 'koalition', mood: 2, interests: ['Finanzen', 'Sicherheit'], votes: 5 },
  { id: 'HH', name: 'Hamburg', mp: 'Lisa Petersen', party: 'SPD', alignment: 'neutral', mood: 2, interests: ['Handel', 'Urbanisierung'], votes: 3 },
  { id: 'HB', name: 'Bremen', mp: 'Jan Kühne', party: 'SPD', alignment: 'neutral', mood: 2, interests: ['Häfen', 'Bildung'], votes: 3 },
  { id: 'BE', name: 'Berlin', mp: 'Kai Neumann', party: 'Grüne', alignment: 'neutral', mood: 3, interests: ['Klimaschutz', 'Urbanisierung'], votes: 4 },
  { id: 'SH', name: 'Schleswig-Holstein', mp: 'Nils Andersen', party: 'CDU', alignment: 'neutral', mood: 2, interests: ['Windenergie', 'Tourismus'], votes: 4 },
  { id: 'SL', name: 'Saarland', mp: 'Anne Müller', party: 'SPD', alignment: 'neutral', mood: 2, interests: ['Strukturwandel', 'Industrie'], votes: 3 },
  { id: 'RP', name: 'Rheinland-Pfalz', mp: 'Thomas Becker', party: 'SPD', alignment: 'neutral', mood: 2, interests: ['Weinbau', 'Mittelstand'], votes: 4 },
  { id: 'BB', name: 'Brandenburg', mp: 'Sabine Lehne', party: 'SPD', alignment: 'opposition', mood: 1, interests: ['Strukturwandel', 'Migration'], votes: 4 },
  { id: 'SN', name: 'Sachsen', mp: 'Matthias Kohl', party: 'CDU', alignment: 'opposition', mood: 1, interests: ['Migration', 'Strukturwandel'], votes: 4 },
  { id: 'TH', name: 'Thüringen', mp: 'Gerhard Weise', party: 'CDU', alignment: 'opposition', mood: 1, interests: ['Innere Sicherheit', 'Ländlicher Raum'], votes: 4 },
  { id: 'MV', name: 'Mecklenburg-Vorpommern', mp: 'Rita Schwarz', party: 'SPD', alignment: 'opposition', mood: 1, interests: ['Tourismus', 'Demographie'], votes: 3 },
  { id: 'ST', name: 'Sachsen-Anhalt', mp: 'Peter Haase', party: 'CDU', alignment: 'opposition', mood: 1, interests: ['Chemie', 'Strukturwandel'], votes: 4 },
];

/** Szenario-Konfiguration (Startwerte, nicht i18n) */
export const DEFAULT_SCENARIO: ContentBundle['scenario'] = {
  id: 'standard',
  name: 'Standardszenario',
  startMonth: 1,
  startPK: 100,
  startKPI: { al: 5.2, hh: 0.3, gi: 31.2, zf: 62 },
  startCoalition: 78,
};

/** Fallback ContentBundle wenn API nicht erreichbar (nur für init-Fallback) */
export const DEFAULT_CONTENT: ContentBundle = {
  characters: [],
  events: [],
  charEvents: {},
  bundesratEvents: [],
  laws: [],
  bundesrat: DEFAULT_BUNDESRAT,
  bundesratFraktionen: [],
  koalitionspartner: GRUENE,
  scenario: DEFAULT_SCENARIO,
};
