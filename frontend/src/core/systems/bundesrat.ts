import type {
  GameState,
  BundesratFraktion,
  LawLobbyFraktion,
  LobbyTradeoffOptions,
  KpiDelta,
} from '../types';
import { addLog } from '../engine';
import { scheduleEffects } from './economy';
import { applyMoodChange } from './characters';
import { applyMilieuEffekte } from './milieus';
import { setPolitikfeldBeschluss } from './politikfeldDruck';
import { applyGesetzKosten } from './haushalt';

const PK_SCHICHT_1 = 15;
const PK_SCHICHT_1_REDUZIERT = 10; // bei Beziehung 60-79
const PK_BEZIEHUNGSPFLEGE = 10;
const PK_REPARATUR = 25;
const PK_GEGENVORSCHLAG = 20;

const BEREITSCHAFT_PK_BONUS = 20;
const BEREITSCHAFT_TRADEOFF_BONUS = 40;

/** Lobbying nur in den 3 Monaten VOR der geplanten BR-Abstimmung aktiv */
export function isLobbyingActive(state: GameState, gesetzeId: string): boolean {
  const law = state.gesetze.find(g => g.id === gesetzeId);
  if (!law || !law.brVoteMonth || law.status !== 'bt_passed') return false;
  const monateBisVote = law.brVoteMonth - state.month;
  return monateBisVote >= 1 && monateBisVote <= 3;
}

/** PK-Kosten für Schicht 1 abhängig von Beziehung (60-79: 10 PK) */
function getPkKostenSchicht1(beziehung: number): number {
  return beziehung >= 60 && beziehung <= 79 ? PK_SCHICHT_1_REDUZIERT : PK_SCHICHT_1;
}

/** Beziehung 0-19: Lobbying gesperrt bis Reparatur (25 PK, 1 Monat) */
function canLobby(fraktion: BundesratFraktion, state: GameState): boolean {
  if (fraktion.beziehung >= 20) return true;
  if (fraktion.beziehung < 0) return true; // Edge case
  // Reparatur läuft: prüfen ob abgeschlossen
  if (fraktion.reparaturEndMonth != null) {
    return state.month >= fraktion.reparaturEndMonth;
  }
  return false;
}

/** Effekt-Multiplikator bei Beziehung 20-39: halbiert */
function getLobbyEffektMultiplikator(beziehung: number): number {
  if (beziehung >= 40) return 1;
  if (beziehung >= 20) return 0.5;
  return 0; // 0-19: gesperrt (außer nach Reparatur)
}

/** Prüft ob Gesetz ideologisch ist (Konservativer Block / Ostblock lehnen ab) */
function isIdeologisch(gesetzeId: string, fraktionId: string): boolean {
  const ideologischFuer = {
    konservativer_block: ['ee', 'wb', 'bp'], // Huber gegen Rot-Grün
    ostblock: ['ee'], // Kohl gegen Klima
  };
  const gegen = ideologischFuer[fraktionId as keyof typeof ideologischFuer];
  return gegen?.includes(gesetzeId) ?? false;
}

/**
 * Berechnet die Bundesrat-Mehrheit für ein Gesetz.
 * Integriert: Basis, PK-Lobbying, Trade-off, Beziehungsbonus (3 Schichten).
 */
export function calcBundesratMehrheit(
  state: GameState,
  gesetzeId: string,
): { ja: number; nein: number; mehrheit: boolean; details: string[] } {
  const law = state.gesetze.find(g => g.id === gesetzeId);
  const details: string[] = [];
  if (!law) return { ja: 0, nein: 0, mehrheit: false, details };

  let ja = 0;
  let nein = 0;

  const vorstufenBonus = state.gesetzProjekte?.[gesetzeId]?.boni?.bundesratBonus ?? 0;

  for (const f of state.bundesratFraktionen) {
    const lobby: LawLobbyFraktion = law.lobbyFraktionen?.[f.id] ?? { pkInvestiert: false };
    const effMult = getLobbyEffektMultiplikator(f.beziehung);
    const reparaturAktiv = f.beziehung < 20 && (f.reparaturEndMonth == null || state.month < f.reparaturEndMonth);

    let bereitschaft = f.basisBereitschaft;

    // Schicht 3: Beziehung 80-100 + nicht-ideologisch => Auto-Ja
    if (f.beziehung >= 80 && !isIdeologisch(gesetzeId, f.id)) {
      bereitschaft = 100;
      details.push(`${f.name}: Auto-Ja (Beziehung ${f.beziehung})`);
    } else if (reparaturAktiv) {
      bereitschaft = 0;
      details.push(`${f.name}: Lobbying gesperrt (Beziehung ${f.beziehung}, Reparatur nötig)`);
    } else {
      // Schicht 1: PK-Investition
      if (lobby.pkInvestiert) {
        const bonus = BEREITSCHAFT_PK_BONUS * effMult;
        bereitschaft += bonus;
        details.push(`${f.name}: +${bonus}% PK-Lobbying`);
      }
      // Schicht 2: Trade-off angenommen
      if (lobby.tradeoffAngenommen) {
        const bonus = BEREITSCHAFT_TRADEOFF_BONUS * effMult;
        bereitschaft += bonus;
        details.push(`${f.name}: +${bonus}% Trade-off`);
      }
      // Beziehungsbonus (passiv): leichter Bonus aus Beziehung
      const beziehungsBonus = Math.min(15, Math.floor(f.beziehung / 7));
      bereitschaft += beziehungsBonus;
      if (vorstufenBonus > 0) {
        bereitschaft += vorstufenBonus;
        details.push(`${f.name}: +${vorstufenBonus}% Vorstufen-Bonus`);
      }
      details.push(`${f.name}: Basis ${f.basisBereitschaft} + Beziehung +${beziehungsBonus} → ${bereitschaft}%`);
    }

    const stimmtJa = bereitschaft > 50;
    const laenderCount = f.laender.length;

    if (stimmtJa) {
      ja += laenderCount;
    } else {
      nein += laenderCount;
    }
  }

  return {
    ja,
    nein,
    mehrheit: ja >= 9, // 9 von 16 Ländern
    details,
  };
}

/** Vote-Details pro Fraktion für UI (Abstimmungsbalken, Fraktionskarten) */
export function getBundesratVoteDetails(
  state: GameState,
  gesetzeId: string,
): { fraktionId: string; bereitschaft: number; stimmtJa: boolean; laender: string[] }[] {
  const law = state.gesetze.find(g => g.id === gesetzeId);
  if (!law) return [];

  const vorstufenBonus = state.gesetzProjekte?.[gesetzeId]?.boni?.bundesratBonus ?? 0;

  return state.bundesratFraktionen.map((f) => {
    const lobby: LawLobbyFraktion = law.lobbyFraktionen?.[f.id] ?? { pkInvestiert: false };
    const effMult = getLobbyEffektMultiplikator(f.beziehung);
    const reparaturAktiv = f.beziehung < 20 && (f.reparaturEndMonth == null || state.month < f.reparaturEndMonth);

    let bereitschaft = f.basisBereitschaft;

    if (f.beziehung >= 80 && !isIdeologisch(gesetzeId, f.id)) {
      bereitschaft = 100;
    } else if (reparaturAktiv) {
      bereitschaft = 0;
    } else {
      if (lobby.pkInvestiert) bereitschaft += BEREITSCHAFT_PK_BONUS * effMult;
      if (lobby.tradeoffAngenommen) bereitschaft += BEREITSCHAFT_TRADEOFF_BONUS * effMult;
      bereitschaft += Math.min(15, Math.floor(f.beziehung / 7));
      bereitschaft += vorstufenBonus;
    }

    return {
      fraktionId: f.id,
      bereitschaft: Math.min(100, Math.max(0, bereitschaft)),
      stimmtJa: bereitschaft > 50,
      laender: f.laender,
    };
  });
}

/** 16 Felder für Abstimmungsbalken: { landId, fraktionId, color, stimmtJa } */
export function getBundesratAbstimmungsFelder(
  state: GameState,
  gesetzeId: string,
): { landId: string; fraktionId: string; color: string; stimmtJa: boolean }[] {
  const details = getBundesratVoteDetails(state, gesetzeId);
  const fraktionen = state.bundesratFraktionen;
  const result: { landId: string; fraktionId: string; color: string; stimmtJa: boolean }[] = [];

  for (const d of details) {
    const f = fraktionen.find(x => x.id === d.fraktionId);
    if (!f) continue;
    for (const landId of d.laender) {
      result.push({
        landId,
        fraktionId: f.id,
        color: f.sprecher.color,
        stimmtJa: d.stimmtJa,
      });
    }
  }
  return result;
}

/** Vereinfachte Mehrheit für Kompatibilität (16 Länder, 9 Mehrheit) */
export function calcBundesratMehrheitSimple(
  fraktionen: BundesratFraktion[],
): { ja: number; nein: number; mehrheit: boolean } {
  // Fallback wenn kein State: alte Logik
  let ja = 0;
  let nein = 0;
  for (const f of fraktionen) {
    const effBereitschaft = f.basisBereitschaft + f.beziehung * 0.2;
    const stimmtJa = effBereitschaft > 50;
    const laenderCount = f.laender.length;
    if (stimmtJa) ja += laenderCount;
    else nein += laenderCount;
  }
  return { ja, nein, mehrheit: ja >= 9 };
}

function applyKpiDelta(state: GameState, delta: Partial<KpiDelta>): GameState {
  const newKpi = { ...state.kpi };
  for (const [k, v] of Object.entries(delta)) {
    if (v != null && ['hh', 'zf', 'gi', 'al'].includes(k)) {
      const key = k as keyof typeof newKpi;
      newKpi[key] = +Math.max(0, (newKpi[key] + v)).toFixed(2);
      if (key === 'zf') newKpi.zf = Math.min(100, newKpi.zf);
    }
  }
  return { ...state, kpi: newKpi };
}

function applyTradeoffEffects(state: GameState, tradeoff: { effect?: Partial<KpiDelta>; charMood?: Record<string, number> }): GameState {
  let s = state;
  if (tradeoff.effect && Object.keys(tradeoff.effect).length > 0) {
    s = applyKpiDelta(s, tradeoff.effect);
  }
  if (tradeoff.charMood && Object.keys(tradeoff.charMood).length > 0) {
    s = applyMoodChange(s, tradeoff.charMood);
  }
  return s;
}

/**
 * Hauptfunktion: Lobbying bei einer Bundesrat-Fraktion.
 * @param schicht 1 = PK-Investition, 2 = Trade-off, 'beziehungspflege' = außerhalb Fenster, 'reparatur' = Beziehung 0-19
 */
export function lobbyFraktion(
  state: GameState,
  fraktionId: string,
  gesetzeId: string,
  schicht: 1 | 2 | 'beziehungspflege' | 'reparatur',
  tradeoffOptions?: LobbyTradeoffOptions,
): GameState {
  const fraktion = state.bundesratFraktionen.find(f => f.id === fraktionId);
  const lawIdx = state.gesetze.findIndex(g => g.id === gesetzeId);
  if (!fraktion || lawIdx === -1) return state;

  const law = state.gesetze[lawIdx];
  const lobby: { pkInvestiert: boolean; tradeoffAngenommen?: boolean; tradeoffAblehnen?: boolean; tradeoffGegenvorschlag?: boolean } =
    law.lobbyFraktionen?.[fraktionId] ?? { pkInvestiert: false };
  const isActive = isLobbyingActive(state, gesetzeId);

  // --- Schicht: Beziehungspflege (außerhalb Zeitfenster) ---
  if (schicht === 'beziehungspflege') {
    if (isActive) return state; // Im Fenster: normales Lobbying
    if (state.pk < PK_BEZIEHUNGSPFLEGE) return state;

    const fraktionen = state.bundesratFraktionen.map(f =>
      f.id === fraktionId
        ? { ...f, beziehung: Math.min(100, f.beziehung + 3) }
        : f,
    );
    return addLog(
      { ...state, pk: state.pk - PK_BEZIEHUNGSPFLEGE, bundesratFraktionen: fraktionen },
      `Beziehungspflege bei ${fraktion.sprecher.name}: +3 Beziehung`,
      'g',
    );
  }

  // --- Schicht: Reparatur (Beziehung 0-19) ---
  if (schicht === 'reparatur') {
    if (fraktion.beziehung >= 20) return state;
    if (fraktion.reparaturEndMonth != null && state.month < fraktion.reparaturEndMonth) return state;
    if (state.pk < PK_REPARATUR) return state;

    const fraktionen = state.bundesratFraktionen.map(f =>
      f.id === fraktionId
        ? { ...f, beziehung: Math.min(25, f.beziehung + 10), reparaturEndMonth: state.month + 1 }
        : f,
    );
    return addLog(
      { ...state, pk: state.pk - PK_REPARATUR, bundesratFraktionen: fraktionen },
      `Beziehungsreparatur bei ${fraktion.sprecher.name}: 1 Monat Laufzeit`,
      'g',
    );
  }

  // --- Schicht 1: PK-Investition ---
  if (schicht === 1) {
    if (!isActive) return state;
    if (!canLobby(fraktion, state)) return state;
    if (lobby.pkInvestiert) return state;

    const cost = getPkKostenSchicht1(fraktion.beziehung);
    if (state.pk < cost) return state;

    const gesetze = state.gesetze.map((g, i) => {
      if (i !== lawIdx) return g;
      const lf = { ...(g.lobbyFraktionen ?? {}), [fraktionId]: { ...lobby, pkInvestiert: true } };
      return { ...g, lobbyFraktionen: lf };
    });

    return addLog(
      { ...state, pk: state.pk - cost, gesetze },
      `PK-Lobbying bei ${fraktion.sprecher.name} für ${law.kurz}: +${BEREITSCHAFT_PK_BONUS}% Bereitschaft`,
      'g',
    );
  }

  // --- Schicht 2: Trade-off ---
  if (schicht === 2 && tradeoffOptions) {
    if (!isActive) return state;
    if (!canLobby(fraktion, state)) return state;
    if (lobby.tradeoffAngenommen || lobby.tradeoffAblehnen || lobby.tradeoffGegenvorschlag) return state;

    const tradeoff = fraktion.tradeoffPool.find(t => t.id === tradeoffOptions.tradeoffId);
    if (!tradeoff) return state;

    if (tradeoffOptions.action === 'annehmen') {
      const newState = applyTradeoffEffects(state, tradeoff);
      const fraktionen = newState.bundesratFraktionen.map(f =>
        f.id === fraktionId ? { ...f, beziehung: Math.min(100, f.beziehung + 10) } : f,
      );
      const gesetze = newState.gesetze.map((g, i) => {
        if (i !== lawIdx) return g;
        const lf = { ...(g.lobbyFraktionen ?? {}), [fraktionId]: { ...lobby, tradeoffAngenommen: true } };
        return { ...g, lobbyFraktionen: lf };
      });
      return addLog(
        { ...newState, bundesratFraktionen: fraktionen, gesetze },
        `Trade-off angenommen: ${fraktion.sprecher.name} stimmt zu. Beziehung +10.`,
        'g',
      );
    }

    if (tradeoffOptions.action === 'ablehnen') {
      const fraktionen = state.bundesratFraktionen.map(f =>
        f.id === fraktionId ? { ...f, beziehung: Math.max(0, f.beziehung - 5) } : f,
      );
      const gesetze = state.gesetze.map((g, i) => {
        if (i !== lawIdx) return g;
        const lf = { ...(g.lobbyFraktionen ?? {}), [fraktionId]: { ...lobby, tradeoffAblehnen: true } };
        return { ...g, lobbyFraktionen: lf };
      });
      return addLog(
        { ...state, bundesratFraktionen: fraktionen, gesetze },
        `Trade-off abgelehnt: ${fraktion.sprecher.name} bei Basis-Bereitschaft. Beziehung -5.`,
        'r',
      );
    }

    if (tradeoffOptions.action === 'gegenvorschlag') {
      if (state.pk < PK_GEGENVORSCHLAG) return state;
      // Gegenvorschlag: günstigerer Effekt (halbe Werte)
      const abgeschwaecht = Object.fromEntries(
        Object.entries(tradeoff.effect ?? {}).map(([k, v]) => [k, (v as number) * 0.5]),
      ) as Partial<KpiDelta>;
      const newState = applyTradeoffEffects({ ...state, pk: state.pk - PK_GEGENVORSCHLAG }, { effect: abgeschwaecht });
      const fraktionen = newState.bundesratFraktionen.map(f =>
        f.id === fraktionId ? { ...f, beziehung: Math.min(100, f.beziehung + 5) } : f,
      );
      const gesetze = newState.gesetze.map((g, i) => {
        if (i !== lawIdx) return g;
        const lf = { ...(g.lobbyFraktionen ?? {}), [fraktionId]: { ...lobby, tradeoffGegenvorschlag: true } };
        return { ...g, lobbyFraktionen: lf };
      });
      return addLog(
        { ...newState, bundesratFraktionen: fraktionen, gesetze },
        `Gegenvorschlag bei ${fraktion.sprecher.name}: günstigere Alternative. Beziehung +5.`,
        'g',
      );
    }
  }

  return state;
}

/** Legacy: Länder-basiertes Lobbying (für Stufe 2 / vereinfachter Bundesrat) */
export function lobbyLand(state: GameState, landId: string): GameState {
  if (state.pk < 15) return state;

  const idx = state.bundesrat.findIndex(l => l.id === landId);
  if (idx === -1) return state;
  const land = state.bundesrat[idx];

  const moodGain = Math.floor(Math.random() * 2) + 1;
  const bundesrat = state.bundesrat.map((l, i) =>
    i === idx ? { ...l, mood: Math.min(4, l.mood + moodGain) } : l,
  );

  return addLog(
    { ...state, pk: state.pk - 15, bundesrat },
    `Lobbying bei MP ${land.mp} (${land.name}): Stimmung +${moodGain}`,
    '',
  );
}

/** Prüft Kohl-Sonderregel: Beziehung < 15 → Sabotage-Event */
export function checkKohlSabotage(state: GameState): { triggered: boolean; lawId?: string } {
  const kohl = state.bundesratFraktionen.find(f => f.id === 'ostblock' && f.sonderregel === 'kohl_saboteur');
  if (!kohl || kohl.beziehung >= 15) return { triggered: false };

  const btPassedLaws = state.gesetze.filter(
    g => g.status === 'bt_passed' && g.tags.includes('land') && !g.kohlSabotageTriggered,
  );
  if (btPassedLaws.length === 0) return { triggered: false };

  const law = btPassedLaws[0];
  return { triggered: true, lawId: law.id };
}

export interface BundesratVoteContext {
  milieus: { id: string; ideologie: { wirtschaft: number; gesellschaft: number; staat: number }; min_complexity: number }[];
  complexity: number;
}

/** Führt die Bundesratsabstimmung durch und wendet Ergebnis an */
export function executeBundesratVote(
  state: GameState,
  lawId: string,
  voteContext?: BundesratVoteContext,
): GameState {
  const result = calcBundesratMehrheit(state, lawId);
  const idx = state.gesetze.findIndex((g) => g.id === lawId);
  if (idx === -1) return state;
  const law = state.gesetze[idx];

  if (result.mehrheit) {
    const gesetze = state.gesetze.map((g, i) =>
      i === idx ? { ...g, status: 'beschlossen' as const } : g,
    );
    let newState: GameState = { ...state, gesetze };
    newState = applyGesetzKosten(newState, lawId);
    const lawForEffects = { effekte: law.effekte as Record<string, number>, lag: law.lag, kurz: law.kurz };
    newState = scheduleEffects(newState, lawForEffects);

    if (voteContext?.milieus) {
      newState = applyMilieuEffekte(newState, lawId, voteContext.milieus, voteContext.complexity);
    }
    if (law.politikfeldId) {
      newState = setPolitikfeldBeschluss(newState, law.politikfeldId);
    }

    return addLog(newState, `${law.kurz} im Bundesrat beschlossen — Wirkung in ${law.lag} Monaten`, 'g');
  } else {
    const gesetze = state.gesetze.map((g, i) =>
      i === idx ? { ...g, status: 'blockiert' as const, blockiert: 'bundesrat' as const } : g,
    );
    return addLog(
      { ...state, gesetze, speed: 0 },
      `${law.kurz}: Bundesrat blockiert! Ebenenwechsel möglich.`,
      'r',
    );
  }
}
