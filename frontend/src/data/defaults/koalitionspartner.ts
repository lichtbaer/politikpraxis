import type {
  KoalitionspartnerContent,
  KoalitionspartnerParteiId,
  GameEvent,
  Ideologie,
  PartnerForderung,
} from '../../core/types';
import { SPIELBARE_PARTEIEN, type SpielerParteiId } from './parteien';

/** SMA-299: Alle Parteien mit Ideologie für dynamische Koalitionspartner-Berechnung */
export interface ParteiMitIdeologie {
  id: KoalitionspartnerParteiId;
  name: string;
  kuerzel: string;
  ideologie: Ideologie;
}

export const ALLE_PARTEIEN: ParteiMitIdeologie[] = [
  { id: 'sdp', name: 'Sozialdemokratische Partei', kuerzel: 'SDP', ideologie: { wirtschaft: -40, gesellschaft: -20, staat: -40 } },
  { id: 'cdp', name: 'Christlich-Demokratische Partei', kuerzel: 'CDP', ideologie: { wirtschaft: 20, gesellschaft: 30, staat: 20 } },
  { id: 'gp', name: 'Grüne Partei', kuerzel: 'GP', ideologie: { wirtschaft: -50, gesellschaft: -70, staat: -20 } },
  { id: 'ldp', name: 'Liberal-Demokratische Partei', kuerzel: 'LDP', ideologie: { wirtschaft: 60, gesellschaft: -10, staat: 60 } },
  { id: 'lp', name: 'Linke Partei', kuerzel: 'LP', ideologie: { wirtschaft: -65, gesellschaft: -40, staat: -60 } },
];

/** SMA-299: Koalitionspartner-Profil (wenn Partei nicht Spieler-Partei ist) */
export interface KoalitionspartnerProfil {
  sprecher: string;
  initials: string;
  kernmilieus: string[];
  kernverbaende: string[];
  schluesselthemen: string[];
  forderungen?: PartnerForderung[];
  /** Beziehungs-Start je Spieler-Partei */
  beziehungStart: (spielerParteiId: SpielerParteiId) => number;
}

export const KOALITIONSPARTNER_PROFILE: Record<KoalitionspartnerParteiId, KoalitionspartnerProfil> = {
  sdp: {
    sprecher: 'Thomas Reinhardt',
    initials: 'TR',
    kernmilieus: ['soziale_mitte', 'prekaere', 'leistungstraeger'],
    kernverbaende: ['gbd', 'uvb'],
    schluesselthemen: ['arbeit_soziales', 'umwelt_energie'],
    beziehungStart: (spielerParteiId) => ({ sdp: 50, cdp: 40, gp: 60, ldp: 45, lp: 55 }[spielerParteiId] ?? 50),
  },
  cdp: {
    sprecher: 'Heinrich Mauer',
    initials: 'HM',
    kernmilieus: ['etablierte', 'buergerliche_mitte', 'traditionelle'],
    kernverbaende: ['bdi', 'sgd'],
    schluesselthemen: ['wirtschaft_finanzen', 'innere_sicherheit'],
    beziehungStart: (spielerParteiId) => ({ sdp: 45, cdp: 50, gp: 40, ldp: 60, lp: 30 }[spielerParteiId] ?? 50),
  },
  gp: {
    sprecher: 'Lena Fischer',
    initials: 'LF',
    kernmilieus: ['postmaterielle', 'soziale_mitte'],
    kernverbaende: ['uvb', 'bvd'],
    schluesselthemen: ['ee', 'bp'],
    forderungen: [
      { id: 'ee_prioritaet', label: 'EE-Beschleunigung priorisieren', effekte: { hh: -0.2, zf: 2 } },
      { id: 'bp_wohnung', label: 'Bundeswohnungsbauoffensive stärken', effekte: { hh: -0.3, zf: 3 } },
    ],
    beziehungStart: (spielerParteiId) => ({ sdp: 65, cdp: 45, gp: 50, ldp: 50, lp: 55 }[spielerParteiId] ?? 50),
  },
  ldp: {
    sprecher: 'Vera Stahl',
    initials: 'VS',
    kernmilieus: ['etablierte', 'leistungstraeger'],
    kernverbaende: ['bdi', 'dwv'],
    schluesselthemen: ['wirtschaft_finanzen', 'digital_infrastruktur'],
    beziehungStart: (spielerParteiId) => ({ sdp: 50, cdp: 60, gp: 45, ldp: 50, lp: 40 }[spielerParteiId] ?? 50),
  },
  lp: {
    sprecher: 'Karl Voss',
    initials: 'KV',
    kernmilieus: ['prekaere', 'soziale_mitte'],
    kernverbaende: ['gbd', 'sgd'],
    schluesselthemen: ['arbeit_soziales', 'umwelt_energie'],
    beziehungStart: (spielerParteiId) => ({ sdp: 55, cdp: 35, gp: 40, ldp: 30, lp: 45 }[spielerParteiId] ?? 45),
  },
};

/** Baut KoalitionspartnerContent aus Profil + Partei-Daten */
export function buildKoalitionspartnerContent(
  parteiId: KoalitionspartnerParteiId,
  spielerParteiId: SpielerParteiId,
): KoalitionspartnerContent {
  const partei = ALLE_PARTEIEN.find((p) => p.id === parteiId);
  const profil = KOALITIONSPARTNER_PROFILE[parteiId];
  if (!partei || !profil) {
    return GRUENE; // Fallback
  }
  const parteiFarbe = SPIELBARE_PARTEIEN.find((p) => p.id === parteiId)?.farbe;
  return {
    id: parteiId,
    name: partei.name,
    sprecher: profil.sprecher,
    partei_kuerzel: partei.kuerzel,
    partei_farbe: parteiFarbe,
    ideologie: partei.ideologie,
    beziehung_start: profil.beziehungStart(spielerParteiId),
    bt_stimmen: 18,
    kernmilieus: profil.kernmilieus,
    kernverbaende: profil.kernverbaende,
    schluesselthemen: profil.schluesselthemen,
    forderungen: profil.forderungen,
  };
}

/** Koalitionsbruch-Event (Beziehung < 15) */
export const KOALITIONSBRUCH_EVENT: GameEvent = {
  id: 'koalitionsbruch',
  type: 'danger',
  icon: 'danger',
  typeLabel: 'Koalitionskrise',
  title: 'Koalitionspartner droht mit Austritt',
  quote: '„Ohne spürbare Zugeständnisse können wir diese Koalition nicht fortsetzen.“',
  context: 'Die Beziehung zum Koalitionspartner ist auf einem kritischen Tiefstand. Sie haben 3 Monate Zeit zu reagieren.',
  ticker: 'Koalitionskrise: Partner droht mit Austritt',
  choices: [
    {
      label: 'Koalitionsrunde einberufen',
      desc: '15 PK — Beziehung +8',
      cost: 15,
      type: 'primary',
      effect: {},
      koalitionspartnerBeziehung: 8,
      log: 'Koalitionsrunde einberufen. Beziehung verbessert.',
    },
    {
      label: 'Zeit gewinnen',
      desc: 'Weiter verhandeln',
      cost: 0,
      type: 'safe',
      effect: {},
      log: 'Verhandlungen werden fortgesetzt.',
    },
  ],
};

/** Koalitionskrise-Ultimatum (KV-Score >= 70) */
export const KOALITIONSKRISE_ULTIMATUM_EVENT: GameEvent = {
  id: 'koalitionskrise_ultimatum',
  type: 'warn',
  icon: 'warn',
  typeLabel: 'Koalitionsvertrag',
  title: 'Partner fordert Einhaltung des Koalitionsvertrags',
  quote: '„Wir haben einen Vertrag unterzeichnet. Die aktuelle Politik weicht zu stark ab.“',
  context: 'Der Koalitionsvertrag-Score ist kritisch. Der Partner verlangt mehr Kongruenz mit dem vereinbarten Kurs.',
  ticker: 'Koalitionspartner fordert Vertragstreue',
  choices: [
    {
      label: 'Kurs anpassen',
      desc: 'Mehr Rücksicht auf Partner-Themen',
      cost: 0,
      type: 'primary',
      effect: {},
      koalitionspartnerBeziehung: 5,
      log: 'Kurs angepasst. Partner besänftigt.',
    },
    {
      label: 'Standhaft bleiben',
      desc: 'Risiko einer weiteren Eskalation',
      cost: 0,
      type: 'danger',
      effect: {},
      log: 'Keine Zugeständnisse. Spannung bleibt.',
    },
  ],
};

/** Grüne als Standard-Koalitionspartner (Fallback, id = gp) */
export const GRUENE: KoalitionspartnerContent = {
  id: 'gp',
  name: 'Grüne Partei',
  sprecher: 'Lena Fischer',
  partei_kuerzel: 'GP',
  partei_farbe: '#46962B',
  ideologie: { wirtschaft: -50, gesellschaft: -70, staat: -20 },
  beziehung_start: 65,
  bt_stimmen: 18,
  kernmilieus: ['postmaterielle', 'soziale_mitte'],
  kernverbaende: ['uvb', 'bvd'],
  schluesselthemen: ['ee', 'bp'],
  forderungen: [
    { id: 'ee_prioritaet', label: 'EE-Beschleunigung priorisieren', effekte: { hh: -0.2, zf: 2 } },
    { id: 'bp_wohnung', label: 'Bundeswohnungsbauoffensive stärken', effekte: { hh: -0.3, zf: 3 } },
  ],
};

/** Milieu-Namen für Log-Ausgaben */
export const MILIEU_NAMES: Record<string, string> = {
  postmaterielle: 'Postmaterielle',
  soziale_mitte: 'Soziale Mitte',
  arbeit: 'Arbeitsmilieu',
  mitte: 'Mitte',
  prog: 'Progressives Milieu',
};

/** Verband-Kurzbezeichnungen für Log-Ausgaben */
export const VERBAND_KURZ: Record<string, string> = {
  uvb: 'UvB',
  bvd: 'BvD',
  gbd: 'GBD',
  bdi: 'BDI',
  sgd: 'SGD',
  bvl: 'BVL',
  dwv: 'DWV',
};
