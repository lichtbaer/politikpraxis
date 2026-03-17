import type { ContentBundle, BundesratLand } from '../../core/types';

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

/** Fallback Milieus (SMA-261) wenn API nicht erreichbar */
const DEFAULT_MILIEUS: ContentBundle['milieus'] = [
  { id: 'postmaterielle', ideologie: { wirtschaft: -60, gesellschaft: -70, staat: -35 }, min_complexity: 2 },
  { id: 'soziale_mitte', ideologie: { wirtschaft: -45, gesellschaft: -30, staat: -55 }, min_complexity: 2 },
  { id: 'prekaere', ideologie: { wirtschaft: -30, gesellschaft: 40, staat: -60 }, min_complexity: 3 },
  { id: 'buergerliche_mitte', ideologie: { wirtschaft: 10, gesellschaft: 15, staat: -10 }, min_complexity: 2 },
  { id: 'leistungstraeger', ideologie: { wirtschaft: 40, gesellschaft: -20, staat: 20 }, min_complexity: 2 },
  { id: 'etablierte', ideologie: { wirtschaft: 65, gesellschaft: 45, staat: 50 }, min_complexity: 3 },
  { id: 'traditionelle', ideologie: { wirtschaft: -5, gesellschaft: 55, staat: -40 }, min_complexity: 2 },
];

/** Fallback Politikfelder (SMA-261) */
const DEFAULT_POLITIKFELDER: ContentBundle['politikfelder'] = [
  { id: 'umwelt_energie', verbandId: 'uvb', druckEventId: null },
  { id: 'wirtschaft_finanzen', verbandId: 'bdi', druckEventId: null },
  { id: 'bildung_forschung', verbandId: 'bvd', druckEventId: null },
  { id: 'arbeit_soziales', verbandId: 'gbd', druckEventId: null },
];

/** Fallback ContentBundle wenn API nicht erreichbar (nur für init-Fallback) */
export const DEFAULT_CONTENT: ContentBundle = {
  characters: [],
  events: [],
  charEvents: {},
  bundesratEvents: [],
  laws: [],
  bundesrat: DEFAULT_BUNDESRAT,
  bundesratFraktionen: [],
  milieus: DEFAULT_MILIEUS,
  politikfelder: DEFAULT_POLITIKFELDER,
  scenario: DEFAULT_SCENARIO,
};
