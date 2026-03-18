/**
 * SMA-335: Gegenfinanzierungspflicht — kein Gesetz mit negativem Haushaltssaldo
 * ohne aktive Finanzierungsentscheidung.
 *
 * Trigger: Gesetz kostet > 1 Mrd./Jahr oder > 3 Mrd. einmalig
 * Optionen: A) Ministerium kürzen, B) Schulden, C) Steuergesetz verknüpfen, D) Überschuss
 */

import type { GameState, Law, ContentBundle } from '../types';
import { addLog } from '../engine';
import { featureActive } from './features';
import { applyMoodChange } from './characters';
import { SCHULDENBREMSE_SPIELRAUM_BASIS } from '../constants';

/** Ressort-Kürzungen: Einsparung in Mrd. + Effekte */
export interface RessortKuerzung {
  kosten_einsparung: number;
  minister_mood: number;
  milieu_reaktionen: Record<string, number>;
  verbands_reaktionen: Record<string, number>;
  medienklima_delta: number;
}

/** Ressorts die gekürzt werden können (nicht Finanzen) */
const RESSORT_KUERZUNGEN: Record<string, RessortKuerzung> = {
  bildung: {
    kosten_einsparung: 8,
    minister_mood: -2,
    milieu_reaktionen: { prog: -2, mitte: -1, arbeit: -1 },
    verbands_reaktionen: { gbd: -5 },
    medienklima_delta: -2,
  },
  gesundheit: {
    kosten_einsparung: 12,
    minister_mood: -2,
    milieu_reaktionen: { prog: -3, mitte: -2, arbeit: -2 },
    verbands_reaktionen: { gbd: -8 },
    medienklima_delta: -3,
  },
  arbeit: {
    kosten_einsparung: 10,
    minister_mood: -2,
    milieu_reaktionen: { arbeit: -4, mitte: -2, prog: -1 },
    verbands_reaktionen: { dgb: -10 },
    medienklima_delta: -2,
  },
  umwelt: {
    kosten_einsparung: 5,
    minister_mood: -2,
    milieu_reaktionen: { prog: -3, mitte: -1 },
    verbands_reaktionen: { gbd: -5 },
    medienklima_delta: -2,
  },
  wirtschaft: {
    kosten_einsparung: 6,
    minister_mood: -1,
    milieu_reaktionen: { g: -1, mitte: -1 },
    verbands_reaktionen: { bdi: -8 },
    medienklima_delta: -1,
  },
  digital: {
    kosten_einsparung: 4,
    minister_mood: -1,
    milieu_reaktionen: { prog: -1 },
    verbands_reaktionen: {},
    medienklima_delta: 0,
  },
};

export interface GegenfinanzierungsOption {
  key: 'ministerium_kuerzen' | 'schulden' | 'steuergesetz' | 'ueberschuss';
  label_de: string;
  verfuegbar: boolean;
  verfuegbar_grund?: string;
  suboptionen?: Array<{ ressort?: string; gesetzId?: string; kosten_einsparung?: number; einnahmeeffekt?: number }>;
  effekte?: {
    schuldenbremse_belastung?: number;
    minister_mood?: Record<string, number>;
    saldo_delta?: number;
  };
}

/** Prüft ob Gesetz Gegenfinanzierung braucht */
export function brauchtGegenfinanzierung(gesetz: Law): boolean {
  const laufend = gesetz.kosten_laufend ?? 0;
  const einmalig = gesetz.kosten_einmalig ?? 0;
  const einnahme = gesetz.einnahmeeffekt ?? 0;
  // Netto-Kosten: laufend + einmalig/10 (amortisiert) - Einnahmen
  const nettoLaufend = laufend - einnahme;
  return nettoLaufend < -1.0 || einmalig < -3.0;
}

/** Berechnet verfügbare Gegenfinanzierungs-Optionen */
export function berechneOptionen(
  state: GameState,
  gesetz: Law,
  _content: ContentBundle,
  complexity: number,
): GegenfinanzierungsOption[] {
  if (!featureActive(complexity, 'gegenfinanzierung')) return [];

  const kosten = Math.abs(
    gesetz.kosten_laufend ?? 0,
  ) || Math.abs(gesetz.kosten_einmalig ?? 0) / 10;
  if (kosten < 1) return [];

  const haushalt = state.haushalt;
  const schuldenbremseSpielraum =
    haushalt?.schuldenbremseSpielraum ?? SCHULDENBREMSE_SPIELRAUM_BASIS;
  const saldo = haushalt?.saldo ?? 0;
  const eingebrachteIds = (state.eingebrachteGesetze ?? []).map((e) => e.gesetzId);
  const beschlosseneIds = state.gesetze.filter((g) => g.status === 'beschlossen').map((g) => g.id);

  const optionen: GegenfinanzierungsOption[] = [];

  // Option A: Ministerium kürzen
  const kuerzungsOptionen = Object.entries(RESSORT_KUERZUNGEN)
    .filter(([, r]) => r.kosten_einsparung >= kosten * 0.8)
    .map(([ressort, r]) => ({ ressort, ...r }));
  optionen.push({
    key: 'ministerium_kuerzen',
    label_de: 'Ministerium kürzen',
    verfuegbar: kuerzungsOptionen.length > 0,
    verfuegbar_grund: kuerzungsOptionen.length === 0 ? 'Kein Ressort mit ausreichender Einsparung' : undefined,
    suboptionen: kuerzungsOptionen,
  });

  // Option B: Schulden
  const schuldenVerfuegbar = schuldenbremseSpielraum >= kosten;
  optionen.push({
    key: 'schulden',
    label_de: 'Schulden aufnehmen',
    verfuegbar: schuldenVerfuegbar,
    verfuegbar_grund: !schuldenVerfuegbar ? 'Schuldenbremse-Spielraum erschöpft' : undefined,
    effekte: {
      schuldenbremse_belastung: kosten,
      minister_mood: hatMinisterLehmann(state) ? { lehmann: -1 } : {},
    },
  });

  // Option C: Steuergesetz verknüpfen (einnahmeeffekt >= 80% der Kosten)
  const steuergesetze = state.gesetze.filter(
    (g) =>
      (g.einnahmeeffekt ?? 0) >= kosten * 0.8 &&
      !eingebrachteIds.includes(g.id) &&
      !beschlosseneIds.includes(g.id) &&
      g.status === 'entwurf',
  );
  optionen.push({
    key: 'steuergesetz',
    label_de: 'Steuergesetz verknüpfen',
    verfuegbar: steuergesetze.length > 0,
    verfuegbar_grund: steuergesetze.length === 0 ? 'Kein passendes Steuergesetz verfügbar' : undefined,
    suboptionen: steuergesetze.map((g) => ({
      gesetzId: g.id,
      einnahmeeffekt: g.einnahmeeffekt ?? 0,
    })),
  });

  // Option D: Überschuss
  optionen.push({
    key: 'ueberschuss',
    label_de: 'Aus Überschuss finanzieren',
    verfuegbar: saldo > 0,
    verfuegbar_grund: saldo <= 0 ? 'Kein Haushaltsüberschuss vorhanden' : undefined,
    effekte: { saldo_delta: -kosten },
  });

  return optionen.filter((o) => o.verfuegbar);
}

function hatMinisterLehmann(state: GameState): boolean {
  return state.chars.some(
    (c) => (c.ressort === 'finanzen' && c.pool_partei === 'cdp') || c.id === 'fm',
  );
}

function getMinisterByRessort(state: GameState, ressort: string): { id: string } | null {
  const char = state.chars.find(
    (c) => c.ressort === ressort || c.ressort_partner === ressort,
  );
  return char ? { id: char.id } : null;
}

function getGesetzTitel(state: GameState, gesetzId: string): string {
  const g = state.gesetze.find((x) => x.id === gesetzId);
  return g?.titel ?? g?.kurz ?? gesetzId;
}

/** Wendet gewählte Gegenfinanzierung an und gibt neuen State zurück */
export function wendeGegenfinanzierungAn(
  state: GameState,
  gesetz: Law,
  option: GegenfinanzierungsOption,
  subOption?: string,
): GameState {
  const kosten = Math.abs(gesetz.kosten_laufend ?? 0) || Math.abs(gesetz.kosten_einmalig ?? 0) / 10;

  switch (option.key) {
    case 'ministerium_kuerzen': {
      if (!subOption) return state;
      const ressort = RESSORT_KUERZUNGEN[subOption];
      if (!ressort) return state;

      let newState = state;

      // Minister-Mood senken
      const minister = getMinisterByRessort(state, subOption);
      if (minister) {
        newState = applyMoodChange(newState, { [minister.id]: ressort.minister_mood });
      }

      // Milieu-Reaktionen
      const milieuZustimmung = { ...(newState.milieuZustimmung ?? {}) };
      for (const [m, d] of Object.entries(ressort.milieu_reaktionen)) {
        milieuZustimmung[m] = (milieuZustimmung[m] ?? 50) + d;
      }

      // Verbände
      const verbandsBeziehungen = { ...(newState.verbandsBeziehungen ?? {}) };
      for (const [v, d] of Object.entries(ressort.verbands_reaktionen)) {
        verbandsBeziehungen[v] = Math.max(0, Math.min(100, (verbandsBeziehungen[v] ?? 50) + d));
      }

      // Medienklima
      const medienKlima = Math.max(0, Math.min(100, (newState.medienKlima ?? 55) + ressort.medienklima_delta));

      // Laufende Ausgaben reduzieren (Einsparung)
      const haushalt = newState.haushalt;
      if (haushalt) {
        const neueLaufendeAusgaben = Math.max(0, haushalt.laufendeAusgaben - ressort.kosten_einsparung);
        const neuerSaldo = haushalt.einnahmen - haushalt.pflichtausgaben - neueLaufendeAusgaben;
        newState = {
          ...newState,
          haushalt: {
            ...haushalt,
            laufendeAusgaben: neueLaufendeAusgaben,
            saldo: neuerSaldo,
          },
        };
      }

      return addLog(
        {
          ...newState,
          milieuZustimmung,
          verbandsBeziehungen,
          medienKlima,
        },
        `Gegenfinanzierung: Ressort ${subOption} um ${ressort.kosten_einsparung} Mrd. gekürzt`,
        'info',
      );
    }

    case 'schulden': {
      const haushalt = state.haushalt;
      if (!haushalt) return state;

      const neuerSpielraum = Math.max(0, (haushalt.schuldenbremseSpielraum ?? SCHULDENBREMSE_SPIELRAUM_BASIS) - kosten);
      let newState: GameState = {
        ...state,
        haushalt: {
          ...haushalt,
          schuldenbremseSpielraum: neuerSpielraum,
        },
      };

      if (hatMinisterLehmann(state)) {
        const lehmann = state.chars.find(
          (c) => (c.ressort === 'finanzen' && c.pool_partei === 'cdp') || c.id === 'fm',
        );
        if (lehmann) {
          newState = applyMoodChange(newState, { [lehmann.id]: -1 });
          newState = { ...newState, lehmannUltimatumBeschleunigt: true };
        }
      }

      return addLog(
        newState,
        `Gegenfinanzierung: Schulden aufgenommen (${kosten} Mrd.), Spielraum verbleibend: ${neuerSpielraum.toFixed(1)} Mrd.`,
        'warn',
      );
    }

    case 'steuergesetz': {
      if (!subOption) return state;
      const gekoppelteGesetze = { ...(state.gekoppelteGesetze ?? {}), [gesetz.id]: subOption };
      const titel = getGesetzTitel(state, subOption);
      return addLog(
        { ...state, gekoppelteGesetze },
        `${gesetz.titel ?? gesetz.kurz} wartet auf Beschluss von ${titel}`,
        'info',
      );
    }

    case 'ueberschuss':
      // Nichts tun außer Log — Saldo-Verringerung passiert durch Gesetz-Kosten bei Beschluss
      return addLog(
        state,
        `Gegenfinanzierung: ${kosten} Mrd. aus Haushaltsüberschuss`,
        'info',
      );

    default:
      return state;
  }
}

/** Prüft ob Gesetz durch gekoppeltes Steuergesetz freigegeben ist */
export function istGegenfinanzierungErfuellt(
  state: GameState,
  gesetzId: string,
): boolean {
  const gekoppelt = state.gekoppelteGesetze?.[gesetzId];
  if (!gekoppelt) return true; // Keine Kopplung = immer erfüllt
  const steuergesetz = state.gesetze.find((g) => g.id === gekoppelt);
  return steuergesetz?.status === 'beschlossen';
}
