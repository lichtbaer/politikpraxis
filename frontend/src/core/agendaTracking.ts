/**
 * SMA-504: Live-Fortschritt für Spieler- und Koalitions-Agenda (Sidebar, reine Ableitung aus State + Content).
 * Nutzt SMA-502-Tracker (milieuHistory, medienklimaBelowMonths, charMoodHistory, koalitionsbeziehungLegislatur, …).
 */

import type {
  AgendaZielContent,
  ContentBundle,
  GameState,
  KoalitionsZielContent,
} from './types';
import { AGENDA_TRACKING_MEDIENKLIMA_SCHWELLE } from './constants';

export type AgendaAmpel = 'green' | 'yellow' | 'red';

export type AgendaSidebarSource = 'spieler' | 'koalition';

/** UI-Zeile unter dem Titel (i18n-Key + Parameter) */
export interface AgendaSidebarSubtitle {
  key: string;
  params?: Record<string, string | number>;
}

export interface AgendaSidebarRow {
  id: string;
  source: AgendaSidebarSource;
  titel: string;
  erfuellt: boolean;
  ampel: AgendaAmpel;
  subtitle: AgendaSidebarSubtitle;
}

function num(raw: unknown, fallback = 0): number {
  const n = typeof raw === 'number' ? raw : Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

function str(raw: unknown, fallback = ''): string {
  return typeof raw === 'string' ? raw : fallback;
}

/** Abstand zur Schwelle für Ampel „gelb“ bei Prozentwerten */
function pctMargin(target: number): number {
  return Math.max(2, Math.round(target * 0.04));
}

function ampelHigherIsBetter(value: number, target: number): AgendaAmpel {
  if (value >= target) return 'green';
  const m = pctMargin(target);
  if (value >= target - m) return 'yellow';
  return 'red';
}

function ampelLowerIsBetter(value: number, max: number): AgendaAmpel {
  if (value <= max) return 'green';
  const m = Math.max(1, Math.round(max * 0.25));
  if (value <= max + m) return 'yellow';
  return 'red';
}

function ampelCountTowardsTarget(current: number, target: number): AgendaAmpel {
  if (current >= target) return 'green';
  if (target > 0 && current === target - 1) return 'yellow';
  return 'red';
}

function countBeschlosseneImPolitikfeld(state: GameState, politikfeldId: string): number {
  return state.gesetze.filter(
    (g) => g.status === 'beschlossen' && g.politikfeldId === politikfeldId,
  ).length;
}

function countBeschlosseneGesamt(state: GameState): number {
  return state.gesetze.filter((g) => g.status === 'beschlossen').length;
}

function countBeschlosseneInvestiv(state: GameState): number {
  return state.gesetze.filter((g) => g.status === 'beschlossen' && g.investiv).length;
}

function milieuAktuell(state: GameState, milieuId: string): number {
  return state.milieuZustimmung?.[milieuId] ?? 0;
}

function milieuMinLegislatur(state: GameState, milieuId: string): number {
  const h = state.milieuHistory?.[milieuId];
  if (h && h.months > 0) return h.min;
  return milieuAktuell(state, milieuId);
}

function countMedienMonateUeberSchwelle(state: GameState, schwelle: number): number {
  const hist = state.medienKlimaHistory ?? [];
  return hist.filter((v) => v >= schwelle).length;
}

function longestHaushaltSaldoStreak(
  history: number[],
  minSaldo: number,
  upToLength: number,
): number {
  if (history.length === 0) return 0;
  let best = 0;
  let cur = 0;
  const slice = history.slice(-upToLength);
  for (const saldo of slice) {
    if (saldo >= minSaldo) {
      cur += 1;
      best = Math.max(best, cur);
    } else {
      cur = 0;
    }
  }
  return best;
}

function durchschnittKabinettsMood(state: GameState): number {
  const chars = state.chars;
  if (!chars.length) return 0;
  const sum = chars.reduce((a, c) => a + c.mood, 0);
  return sum / chars.length;
}

function monateKoalitionsbeziehungUnter(
  state: GameState,
  partnerProfil: string,
  schwelle: number,
): number {
  const kp = state.koalitionspartner;
  if (!kp || kp.id !== partnerProfil) return 0;
  const leg = state.koalitionsbeziehungLegislatur;
  if (!leg || leg.months < 1) {
    return kp.beziehung < schwelle ? 1 : 0;
  }
  const avg = leg.sum / leg.months;
  let below = 0;
  if (avg < schwelle) below = leg.months;
  else if (kp.beziehung < schwelle) below = 1;
  return below;
}

function monateCharMoodSchlecht(state: GameState, minSchlechtMonateProChar: number): number {
  const hist = state.charMoodHistory ?? {};
  let sum = 0;
  for (const c of state.chars) {
    sum += Math.min(num(hist[c.id], 0), minSchlechtMonateProChar);
  }
  return sum;
}

function evaluateSpielerZiel(state: GameState, z: AgendaZielContent): Omit<AgendaSidebarRow, 'source'> {
  const typ = z.bedingung_typ;
  const p = z.bedingung_param;

  switch (typ) {
    case 'gesetz_anzahl_beschlossen': {
      const target = Math.max(0, Math.round(num(p.min_beschlossen)));
      const current = countBeschlosseneGesamt(state);
      const erfuellt = current >= target;
      return {
        id: z.id,
        titel: z.titel,
        erfuellt,
        ampel: ampelCountTowardsTarget(current, target),
        subtitle: {
          key: 'game:leftPanel.agendaSubtitle.gesetzAnzahl',
          params: { current, target },
        },
      };
    }
    case 'gesetz_politikfeld': {
      const politikfeldId = str(p.politikfeld_id);
      const target = Math.max(0, Math.round(num(p.min_beschlossen)));
      const current = countBeschlosseneImPolitikfeld(state, politikfeldId);
      const erfuellt = current >= target;
      return {
        id: z.id,
        titel: z.titel,
        erfuellt,
        ampel: ampelCountTowardsTarget(current, target),
        subtitle: {
          key: 'game:leftPanel.agendaSubtitle.gesetzPolitikfeld',
          params: { current, target },
        },
      };
    }
    case 'milieu_zustimmung_min': {
      const milieuId = str(p.milieu_id);
      const target = num(p.min_pct);
      const current = milieuAktuell(state, milieuId);
      const minLeg = milieuMinLegislatur(state, milieuId);
      const erfuellt = minLeg >= target;
      return {
        id: z.id,
        titel: z.titel,
        erfuellt,
        ampel: ampelHigherIsBetter(current, target),
        subtitle: {
          key: erfuellt
            ? 'game:leftPanel.agendaSubtitle.milieuMinOk'
            : 'game:leftPanel.agendaSubtitle.milieuMinOffen',
          params: { current: Math.round(current), target: Math.round(target) },
        },
      };
    }
    case 'medienklima_monate_min': {
      const schwelle = num(p.schwelle, 55);
      const target = Math.max(0, Math.round(num(p.min_monate)));
      const current = countMedienMonateUeberSchwelle(state, schwelle);
      const erfuellt = current >= target;
      return {
        id: z.id,
        titel: z.titel,
        erfuellt,
        ampel: ampelCountTowardsTarget(current, target),
        subtitle: {
          key: 'game:leftPanel.agendaSubtitle.medienUeber',
          params: { current, target, schwelle },
        },
      };
    }
    case 'medienklima_monate_max_unter': {
      const schwelle = num(p.schwelle, 35);
      const maxMonate = Math.max(0, Math.round(num(p.max_monate)));
      const current = state.medienklimaBelowMonths ?? 0;
      const erfuellt = current <= maxMonate;
      return {
        id: z.id,
        titel: z.titel,
        erfuellt,
        ampel: ampelLowerIsBetter(current, maxMonate),
        subtitle: {
          key: erfuellt
            ? 'game:leftPanel.agendaSubtitle.medienUntenOk'
            : 'game:leftPanel.agendaSubtitle.medienUntenOffen',
          params: { current, max: maxMonate, schwelle },
        },
      };
    }
    case 'verband_beziehung_min': {
      const verbandId = str(p.verband_id);
      const target = num(p.min_beziehung);
      const current = state.verbandsBeziehungen?.[verbandId] ?? 0;
      const erfuellt = current >= target;
      return {
        id: z.id,
        titel: z.titel,
        erfuellt,
        ampel: ampelHigherIsBetter(current, target),
        subtitle: {
          key: erfuellt
            ? 'game:leftPanel.agendaSubtitle.verbandOk'
            : 'game:leftPanel.agendaSubtitle.verbandOffen',
          params: { current: Math.round(current), target: Math.round(target) },
        },
      };
    }
    case 'haushalt_saldo_min': {
      const minSaldo = num(p.min_saldo_mrd);
      const streakNeeded = Math.max(1, Math.round(num(p.min_monate_am_stueck, 12)));
      const hist = state.haushaltSaldoHistory ?? [];
      const current = longestHaushaltSaldoStreak(hist, minSaldo, streakNeeded + 24);
      const erfuellt = current >= streakNeeded;
      const ampel = ampelCountTowardsTarget(current, streakNeeded);
      return {
        id: z.id,
        titel: z.titel,
        erfuellt,
        ampel,
        subtitle: {
          key: erfuellt
            ? 'game:leftPanel.agendaSubtitle.haushaltStreakOk'
            : 'game:leftPanel.agendaSubtitle.haushaltStreakOffen',
          params: { current, target: streakNeeded },
        },
      };
    }
    case 'gesetz_investiv_beschlossen': {
      const target = Math.max(0, Math.round(num(p.min_beschlossen)));
      const current = countBeschlosseneInvestiv(state);
      const erfuellt = current >= target;
      return {
        id: z.id,
        titel: z.titel,
        erfuellt,
        ampel: ampelCountTowardsTarget(current, target),
        subtitle: {
          key: 'game:leftPanel.agendaSubtitle.investiv',
          params: { current, target },
        },
      };
    }
    case 'char_mood_min_durchschnitt': {
      const target = num(p.min_avg_mood, 3);
      const current = durchschnittKabinettsMood(state);
      const erfuellt = current >= target - 1e-6;
      const rounded = Math.round(current * 10) / 10;
      return {
        id: z.id,
        titel: z.titel,
        erfuellt,
        ampel: ampelHigherIsBetter(rounded, target),
        subtitle: {
          key: erfuellt
            ? 'game:leftPanel.agendaSubtitle.moodOk'
            : 'game:leftPanel.agendaSubtitle.moodOffen',
          params: { current: rounded, target },
        },
      };
    }
    default:
      return {
        id: z.id,
        titel: z.titel,
        erfuellt: false,
        ampel: 'yellow',
        subtitle: { key: 'game:leftPanel.agendaSubtitle.unbekannt' },
      };
  }
}

function evaluateKoalitionsZiel(
  state: GameState,
  z: KoalitionsZielContent,
): Omit<AgendaSidebarRow, 'source'> {
  const typ = z.bedingung_typ;
  const p = z.bedingung_param;
  const partner = z.partner_profil;

  switch (typ) {
    case 'gesetz_politikfeld': {
      const politikfeldId = str(p.politikfeld_id);
      const target = Math.max(0, Math.round(num(p.min_beschlossen)));
      const current = countBeschlosseneImPolitikfeld(state, politikfeldId);
      const erfuellt = current >= target;
      return {
        id: z.id,
        titel: z.titel,
        erfuellt,
        ampel: ampelCountTowardsTarget(current, target),
        subtitle: {
          key: erfuellt
            ? 'game:leftPanel.agendaSubtitle.koalitionGesetzOk'
            : 'game:leftPanel.agendaSubtitle.koalitionGesetzOffen',
          params: { current, target },
        },
      };
    }
    case 'milieu_zustimmung_min': {
      const milieuId = str(p.milieu_id);
      const target = num(p.min_pct);
      const current = milieuAktuell(state, milieuId);
      const minLeg = milieuMinLegislatur(state, milieuId);
      const erfuellt = minLeg >= target;
      return {
        id: z.id,
        titel: z.titel,
        erfuellt,
        ampel: ampelHigherIsBetter(current, target),
        subtitle: {
          key: erfuellt
            ? 'game:leftPanel.agendaSubtitle.koalitionMilieuOk'
            : 'game:leftPanel.agendaSubtitle.koalitionMilieuOffen',
          params: { current: Math.round(current), target: Math.round(target) },
        },
      };
    }
    case 'verband_beziehung_min': {
      const verbandId = str(p.verband_id);
      const target = num(p.min_beziehung);
      const current = state.verbandsBeziehungen?.[verbandId] ?? 0;
      const erfuellt = current >= target;
      return {
        id: z.id,
        titel: z.titel,
        erfuellt,
        ampel: ampelHigherIsBetter(current, target),
        subtitle: {
          key: erfuellt
            ? 'game:leftPanel.agendaSubtitle.koalitionVerbandOk'
            : 'game:leftPanel.agendaSubtitle.koalitionVerbandOffen',
          params: { current: Math.round(current), target: Math.round(target) },
        },
      };
    }
    case 'koalitionsbeziehung_min': {
      const schwelle = num(p.min_beziehung);
      const kp = state.koalitionspartner;
      const current = kp?.id === partner ? kp.beziehung : 0;
      const erfuellt = current >= schwelle;
      return {
        id: z.id,
        titel: z.titel,
        erfuellt,
        ampel: ampelHigherIsBetter(current, schwelle),
        subtitle: {
          key: erfuellt
            ? 'game:leftPanel.agendaSubtitle.koalitionPartnerOk'
            : 'game:leftPanel.agendaSubtitle.koalitionPartnerOffen',
          params: { current: Math.round(current), target: Math.round(schwelle) },
        },
      };
    }
    case 'koalitionsbeziehung_monate_unter': {
      const schwelle = num(p.schwelle);
      const maxMonate = Math.max(0, Math.round(num(p.max_monate)));
      const current = monateKoalitionsbeziehungUnter(state, partner, schwelle);
      const erfuellt = current <= maxMonate;
      return {
        id: z.id,
        titel: z.titel,
        erfuellt,
        ampel: ampelLowerIsBetter(current, maxMonate),
        subtitle: {
          key: erfuellt
            ? 'game:leftPanel.agendaSubtitle.koalitionBeziehungOk'
            : 'game:leftPanel.agendaSubtitle.koalitionBeziehungOffen',
          params: { current, max: maxMonate },
        },
      };
    }
    case 'char_mood_schlecht_max': {
      const maxSum = Math.max(0, Math.round(num(p.max_summe_monate)));
      const proChar = Math.max(1, Math.round(num(p.pro_char_max, 6)));
      const current = monateCharMoodSchlecht(state, proChar);
      const erfuellt = current <= maxSum;
      return {
        id: z.id,
        titel: z.titel,
        erfuellt,
        ampel: ampelLowerIsBetter(current, maxSum),
        subtitle: {
          key: erfuellt
            ? 'game:leftPanel.agendaSubtitle.koalitionMoodOk'
            : 'game:leftPanel.agendaSubtitle.koalitionMoodOffen',
          params: { current, max: maxSum },
        },
      };
    }
    case 'medienklima_monate_max_unter': {
      const schwelle = num(p.schwelle, AGENDA_TRACKING_MEDIENKLIMA_SCHWELLE);
      const maxMonate = Math.max(0, Math.round(num(p.max_monate)));
      const current = state.medienklimaBelowMonths ?? 0;
      const erfuellt = current <= maxMonate;
      return {
        id: z.id,
        titel: z.titel,
        erfuellt,
        ampel: ampelLowerIsBetter(current, maxMonate),
        subtitle: {
          key: erfuellt
            ? 'game:leftPanel.agendaSubtitle.koalitionMedienOk'
            : 'game:leftPanel.agendaSubtitle.koalitionMedienOffen',
          params: { current, max: maxMonate, schwelle },
        },
      };
    }
    default:
      return {
        id: z.id,
        titel: z.titel,
        erfuellt: false,
        ampel: 'yellow',
        subtitle: { key: 'game:leftPanel.agendaSubtitle.unbekannt' },
      };
  }
}

function byIdMap<T extends { id: string }>(items: T[] | undefined): Map<string, T> {
  const m = new Map<string, T>();
  for (const x of items ?? []) m.set(x.id, x);
  return m;
}

/**
 * Baut die Sidebar-Zeilen in fester Reihenfolge: zuerst Spieler-Agenda, dann Koalitions-Agenda.
 */
export function buildAgendaSidebarRows(
  state: GameState,
  content: ContentBundle,
): AgendaSidebarRow[] {
  const spielerIds = state.spielerAgenda ?? [];
  const koaIds = state.koalitionsAgenda ?? [];
  const az = byIdMap(content.agendaZiele);
  const kz = byIdMap(content.koalitionsZiele);

  const rows: AgendaSidebarRow[] = [];

  for (const id of spielerIds) {
    const z = az.get(id);
    if (!z) continue;
    const row = evaluateSpielerZiel(state, z);
    rows.push({ ...row, source: 'spieler' });
  }

  for (const id of koaIds) {
    const z = kz.get(id);
    if (!z) continue;
    const row = evaluateKoalitionsZiel(state, z);
    rows.push({ ...row, source: 'koalition' });
  }

  return rows;
}
