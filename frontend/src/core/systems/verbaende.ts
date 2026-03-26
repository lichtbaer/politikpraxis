import type { GameState, Verband, VerbandTradeoff, KpiDelta, KPI, ContentBundle } from '../types';
import { addLog } from '../engine';
import { featureActive } from './features';
import { adjustMedienKlimaGlobal } from './medienklima';

/** Verbandskonflikte: verbandId → Konflikt-Partner mit Malus */
const KONFLIKTE: Record<string, { partner: string; malus: number }[]> = {
  bdi: [{ partner: 'uvb', malus: -8 }, { partner: 'gbd', malus: -6 }],
  uvb: [{ partner: 'bdi', malus: -8 }, { partner: 'bvl', malus: -5 }],
  bvl: [{ partner: 'uvb', malus: -5 }],
  sgd: [{ partner: 'gbd', malus: -4 }],
};

function getVerband(verbaende: Verband[], verbandId: string): Verband | undefined {
  return verbaende.find(v => v.id === verbandId);
}

function getTradeoff(verband: Verband, tradeoffKey: string): VerbandTradeoff | undefined {
  return verband.tradeoffs?.find(t => t.key === tradeoffKey);
}

/** Effekte eines Trade-offs sofort auf KPI anwenden */
function applyTradeoffEffekte(state: GameState, effekte: Partial<KpiDelta>): GameState {
  const newKpi = { ...state.kpi };
  for (const [k, v] of Object.entries(effekte)) {
    if (v == null || !(k in newKpi)) continue;
    const key = k as keyof KPI;
    newKpi[key] = +Math.max(0, (newKpi[key] ?? 0) + v).toFixed(2);
    if (key === 'zf') newKpi.zf = Math.min(100, newKpi.zf);
  }
  return { ...state, kpi: newKpi };
}

/**
 * Gespräch mit Verband (10 PK → +5 Beziehung).
 * Nur aktiv ab Stufe 3.
 */
export function verbandGespraech(
  state: GameState,
  verbandId: string,
  verbaende: Verband[],
  complexity: number,
): GameState {
  if (!featureActive(complexity, 'verbands_lobbying')) return state;
  if (state.pk < 10) return state;

  const verband = getVerband(verbaende, verbandId);
  if (!verband) return state;

  const bez = state.verbandsBeziehungen?.[verbandId] ?? verband.beziehung_start;
  const newBez = Math.min(100, bez + 5);
  const newBeziehungen = { ...(state.verbandsBeziehungen ?? {}), [verbandId]: newBez };

  return addLog(
    { ...state, pk: state.pk - 10, verbandsBeziehungen: newBeziehungen },
    `Gespräch mit ${verband.kurz} — Beziehung +5`,
    'g',
  );
}

/**
 * Trade-off eines Verbands annehmen.
 * Wendet Effekte an, +15 Beziehung, erhöht Politikfeld-Druck, prüft Verbandskonflikt.
 * SMA-319: cost_pk > 0 → PK abziehen; medienklima_delta, verband_effekte anwenden.
 */
export function verbandTradeoff(
  state: GameState,
  verbandId: string,
  tradeoffKey: string,
  verbaende: Verband[],
  complexity: number,
  content?: ContentBundle,
): GameState {
  if (!featureActive(complexity, 'verbands_lobbying')) return state;

  const verband = getVerband(verbaende, verbandId);
  if (!verband) return state;

  const tradeoff = getTradeoff(verband, tradeoffKey);
  if (!tradeoff) return state;

  const costPk = tradeoff.cost_pk ?? 0;
  if (costPk > 0 && state.pk < costPk) return state;

  let newState = state;
  if (costPk > 0) {
    newState = { ...newState, pk: newState.pk - costPk };
  }

  newState = applyTradeoffEffekte(newState, tradeoff.effekte);

  const bez = newState.verbandsBeziehungen?.[verbandId] ?? verband.beziehung_start;
  const newBez = Math.min(100, bez + 15);
  const newBeziehungen = { ...(newState.verbandsBeziehungen ?? {}), [verbandId]: newBez };

  if (tradeoff.verband_effekte && Object.keys(tradeoff.verband_effekte).length > 0) {
    for (const [otherId, delta] of Object.entries(tradeoff.verband_effekte)) {
      const current = newBeziehungen[otherId] ?? getVerband(verbaende, otherId)?.beziehung_start ?? 50;
      newBeziehungen[otherId] = Math.max(0, Math.min(100, current + delta));
    }
  }
  newState = { ...newState, verbandsBeziehungen: newBeziehungen };

  if ((tradeoff.medienklima_delta ?? 0) !== 0) {
    newState = adjustMedienKlimaGlobal(newState, tradeoff.medienklima_delta!, complexity, content);
  }

  const feldId = verband.politikfeld_id;
  const currentDruck = newState.politikfeldDruck?.[feldId] ?? 0;
  const newDruck = { ...(newState.politikfeldDruck ?? {}), [feldId]: currentDruck + tradeoff.feld_druck_delta };
  newState = { ...newState, politikfeldDruck: newDruck };

  newState = checkVerbandsKonflikt(newState, verbandId, 'tradeoff_accepted', verbaende);

  return newState;
}

/**
 * Verbandskonflikt: Konflikt-Partner reagieren mit Malus, wenn sie Beziehung ≥ 40 haben.
 */
export function checkVerbandsKonflikt(
  state: GameState,
  verbandId: string,
  _aktion: 'tradeoff_accepted' | 'lobbied',
  verbaende: Verband[],
): GameState {
  const konflikte = KONFLIKTE[verbandId] ?? [];
  const newBeziehungen = { ...(state.verbandsBeziehungen ?? {}) };
  let newState = state;
  const aktiverVerband = getVerband(verbaende, verbandId);

  for (const { partner, malus } of konflikte) {
    const partnerBez = newBeziehungen[partner] ?? verbaende.find(v => v.id === partner)?.beziehung_start ?? 50;
    if (partnerBez >= 40) {
      const newPartnerBez = Math.max(0, partnerBez + malus);
      newBeziehungen[partner] = newPartnerBez;
      const partnerVerband = getVerband(verbaende, partner);
      if (partnerVerband && aktiverVerband) {
        newState = addLog(
          newState,
          `${partnerVerband.kurz} reagiert auf ${aktiverVerband.kurz}-Deal`,
          'r',
        );
      }
    }
  }

  return { ...newState, verbandsBeziehungen: newBeziehungen };
}

/**
 * Abstimmungs-Lobby durch Verband (nur im 3-Monatsfenster, 12 PK).
 * Gibt PK-Modifikator (Bonus) zurück: 0, 2, 5, 8 oder 12 je nach Einflussstärke.
 * Staerke 1–5 (●○○○○ → ●●●●●).
 */
export function verbandLobbyAbstimmung(
  state: GameState,
  verbandId: string,
  gesetzId: string,
  verbaende: Verband[],
  complexity: number,
): { state: GameState; bonus: number } {
  if (!featureActive(complexity, 'verbands_lobbying')) return { state, bonus: 0 };
  if (state.pk < 12) return { state, bonus: 0 };

  const law = state.gesetze.find(g => g.id === gesetzId);
  if (!law || law.status !== 'bt_passed' || !law.brVoteMonth) return { state, bonus: 0 };

  const monateBisVote = law.brVoteMonth - state.month;
  if (monateBisVote < 1 || monateBisVote > 3) return { state, bonus: 0 };

  const staerke = getStaerke(verbandId, law, verbaende);
  const bonusTable = [0, 2, 5, 8, 12];
  const bonus = bonusTable[Math.min(staerke - 1, 4)] ?? 0;

  const newState = { ...state, pk: state.pk - 12 };
  const verband = getVerband(verbaende, verbandId);
  const logState = verband
    ? addLog(newState, `Verbands-Lobby ${verband.kurz} für Abstimmung — Bonus +${bonus}`, 'g')
    : newState;

  const konfliktState = checkVerbandsKonflikt(logState, verbandId, 'lobbied', verbaende);

  return { state: konfliktState, bonus };
}

/** Einflussstärke 1–5 basierend auf Verband-Politikfeld und Gesetz-Tags */
function getStaerke(verbandId: string, law: { tags: string[] }, verbaende: Verband[]): number {
  const verband = getVerband(verbaende, verbandId);
  if (!verband) return 1;

  const feld = verband.politikfeld_id;
  const tagMatch = law.tags.includes(feld) || law.tags.some(t => t === 'bund' && feld === 'wirtschaft');
  if (tagMatch) return 4;
  if (['wirtschaft', 'energie', 'umwelt'].includes(feld)) return 3;
  return 2;
}

/**
 * Monatliche Verbands-Aktionen: passiver Bonus bei hoher Beziehung, Eskalation bei niedriger.
 */
export function checkVerbandsAktionen(
  state: GameState,
  verbaende: Verband[],
  complexity: number,
): GameState {
  if (!featureActive(complexity, 'verbands_lobbying')) return state;
  if (!verbaende.length) return state;

  let newState = state;
  const fired = state.firedEvents ?? [];

  for (const verband of verbaende) {
    const bez = newState.verbandsBeziehungen?.[verband.id] ?? verband.beziehung_start;

    if (bez < 15 && !fired.includes(`verband_eskalation_${verband.id}`)) {
      newState = triggerVerbandEskalation(newState, verband);
      newState = {
        ...newState,
        firedEvents: [...newState.firedEvents, `verband_eskalation_${verband.id}`],
      };
    }
  }

  return newState;
}

/** Verband eskaliert bei Beziehung < 15 */
function triggerVerbandEskalation(state: GameState, verband: Verband): GameState {
  return addLog(
    state,
    `${verband.kurz} eskaliert — Beziehung kritisch (${state.verbandsBeziehungen?.[verband.id] ?? verband.beziehung_start})`,
    'r',
  );
}
