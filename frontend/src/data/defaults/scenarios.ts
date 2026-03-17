import type { ContentBundle, BundesratLand, Verband, MinisterialInitiative } from '../../core/types';
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

/** Fallback Milieus (SMA-261) wenn API nicht erreichbar. SMA-264: gewicht, basisbeteiligung für Wahlprognose. */
const DEFAULT_MILIEUS: ContentBundle['milieus'] = [
  { id: 'postmaterielle', ideologie: { wirtschaft: -60, gesellschaft: -70, staat: -35 }, min_complexity: 2, gewicht: 12, basisbeteiligung: 85, kurz: 'Postmat.' },
  { id: 'soziale_mitte', ideologie: { wirtschaft: -45, gesellschaft: -30, staat: -55 }, min_complexity: 2, gewicht: 18, basisbeteiligung: 72, kurz: 'Soz. Mitte' },
  { id: 'prekaere', ideologie: { wirtschaft: -30, gesellschaft: 40, staat: -60 }, min_complexity: 3, gewicht: 14, basisbeteiligung: 55, kurz: 'Prekär' },
  { id: 'buergerliche_mitte', ideologie: { wirtschaft: 10, gesellschaft: 15, staat: -10 }, min_complexity: 2, gewicht: 22, basisbeteiligung: 78, kurz: 'Bürg. Mitte' },
  { id: 'leistungstraeger', ideologie: { wirtschaft: 40, gesellschaft: -20, staat: 20 }, min_complexity: 2, gewicht: 16, basisbeteiligung: 68, kurz: 'Leistung' },
  { id: 'etablierte', ideologie: { wirtschaft: 65, gesellschaft: 45, staat: 50 }, min_complexity: 3, gewicht: 10, basisbeteiligung: 88, kurz: 'Etabliert' },
  { id: 'traditionelle', ideologie: { wirtschaft: -5, gesellschaft: 55, staat: -40 }, min_complexity: 2, gewicht: 8, basisbeteiligung: 62, kurz: 'Tradition' },
];

/** Fallback Politikfelder (SMA-261) */
const DEFAULT_POLITIKFELDER: ContentBundle['politikfelder'] = [
  { id: 'umwelt_energie', verbandId: 'uvb', druckEventId: null },
  { id: 'wirtschaft_finanzen', verbandId: 'bdi', druckEventId: null },
  { id: 'bildung_forschung', verbandId: 'bvd', druckEventId: null },
  { id: 'arbeit_soziales', verbandId: 'gbd', druckEventId: null },
];

/** Default-Verbände (BDI, UVB, BVL, SGD, GBD) — ab Stufe 3 */
export const DEFAULT_VERBAENDE: Verband[] = [
  { id: 'bdi', kurz: 'BDI', politikfeld_id: 'wirtschaft', beziehung_start: 50, staerke_eu: 4, tradeoffs: [{ key: 't1', effekte: { hh: -0.2 }, feld_druck_delta: 5 }] },
  { id: 'uvb', kurz: 'UVB', politikfeld_id: 'wirtschaft', beziehung_start: 45, staerke_eu: 4, tradeoffs: [{ key: 't1', effekte: { al: 0.2 }, feld_druck_delta: 3 }] },
  { id: 'bvl', kurz: 'BVL', politikfeld_id: 'umwelt', beziehung_start: 40, staerke_eu: 3, tradeoffs: [{ key: 't1', effekte: { zf: -2 }, feld_druck_delta: 4 }] },
  { id: 'sgd', kurz: 'SGD', politikfeld_id: 'arbeit', beziehung_start: 55, staerke_eu: 3, tradeoffs: [{ key: 't1', effekte: { gi: 0.5 }, feld_druck_delta: 2 }] },
  { id: 'gbd', kurz: 'GBD', politikfeld_id: 'arbeit', beziehung_start: 48, staerke_eu: 3, tradeoffs: [{ key: 't1', effekte: { al: -0.3 }, feld_druck_delta: 4 }] },
];

/** Default Ministerial-Initiativen — ab Stufe 3 */
export const DEFAULT_MINISTERIAL_INITIATIVEN: MinisterialInitiative[] = [
  { id: 'mi_wm_ee', char_id: 'wm', gesetz_ref_id: 'ee', cooldown_months: 8, bedingungen: [{ type: 'min_mood' }, { type: 'interest', value: 'Standortpolitik' }] },
  { id: 'mi_um_ee', char_id: 'um', gesetz_ref_id: 'ee', cooldown_months: 8, bedingungen: [{ type: 'min_mood' }, { type: 'interest', value: 'Klimaschutz' }] },
];

/** EU-Klima-Startwerte (Fallback, aus DB eu_klima_startwerte) */
const DEFAULT_EU_KLIMA_STARTWERTE: ContentBundle['euKlimaStartwerte'] = [
  { politikfeld_id: 'wirtschaft_finanzen', startwert: 55 },
  { politikfeld_id: 'arbeit_soziales', startwert: 45 },
  { politikfeld_id: 'umwelt_energie', startwert: 70 },
  { politikfeld_id: 'innere_sicherheit', startwert: 40 },
  { politikfeld_id: 'bildung_forschung', startwert: 35 },
  { politikfeld_id: 'gesundheit_pflege', startwert: 30 },
  { politikfeld_id: 'digital_infrastruktur', startwert: 65 },
  { politikfeld_id: 'landwirtschaft', startwert: 75 },
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
  koalitionspartner: GRUENE,
  milieus: DEFAULT_MILIEUS,
  politikfelder: DEFAULT_POLITIKFELDER,
  verbaende: DEFAULT_VERBAENDE,
  ministerialInitiativen: DEFAULT_MINISTERIAL_INITIATIVEN,
  euKlimaStartwerte: DEFAULT_EU_KLIMA_STARTWERTE,
  euEvents: [],
  scenario: DEFAULT_SCENARIO,
};
