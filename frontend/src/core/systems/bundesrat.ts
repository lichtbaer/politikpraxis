import type {
  GameState,
  BundesratFraktion,
  LawLobbyFraktion,
  LobbyTradeoffOptions,
  KpiDelta,
  ContentBundle,
} from '../types';
import { SPIELER_PARTEI_TO_PROFIL } from '../../constants/bundeslaenderProfil';
import { withPause } from '../eventPause';
import { PK_REPARATUR, BEREITSCHAFT_TRADEOFF_BONUS, EINSPRUCH_UEBERSTIMMUNG_PK, EINSPRUCH_UEBERSTIMMUNG_SCHWELLE } from '../constants';
import { featureActive } from './features';
import { addLog } from '../engine';
import { scheduleEffects } from './economy';
import { applyMoodChange } from './characters';
import { applyMilieuEffekte } from './milieus';
import { setPolitikfeldBeschluss } from './politikfeldDruck';
import { applyGesetzKosten } from './haushalt';
import { checkProaktiveErfuellung } from './ministerAgenden';
import { applyGesetzMedienAkteureNachBeschluss } from './medienklima';

const PK_SCHICHT_1 = 15;
const PK_SCHICHT_1_REDUZIERT = 10; // bei Beziehung 60-79
const PK_BEZIEHUNGSPFLEGE = 10;
const PK_GEGENVORSCHLAG = 20;

const BEREITSCHAFT_PK_BONUS = 20;

const BR_MEHRHEIT_STIMMEN = 35;
const BR_TOTAL_STIMMEN = 69;

/** SMA-395: Länder-Profile geladen (Themen) — Stimmgewicht-Summe 69, Mehrheit >35 */
export function bundesratNutztLandgewichte(state: GameState): boolean {
  return state.bundesrat.some(l => (l.themen?.length ?? 0) > 0);
}

function getLandBeziehung(state: GameState, landId: string): number {
  const b = state.landBeziehungen?.[landId];
  if (b != null) return Math.max(0, Math.min(100, b));
  return 50;
}

function lawPolitikfelder(law: { politikfeldId?: string | null; politikfeldSekundaer?: string[] }): string[] {
  const out: string[] = [];
  if (law.politikfeldId) out.push(law.politikfeldId);
  const sec = law.politikfeldSekundaer ?? [];
  for (const p of sec) {
    if (p && !out.includes(p)) out.push(p);
  }
  return out;
}

function countThemenMatches(landThemen: string[] | undefined, felder: string[]): number {
  if (!landThemen?.length || !felder.length) return 0;
  let n = 0;
  for (const p of felder) {
    if (landThemen.includes(p)) n++;
  }
  return n;
}

function spielerProfilPartei(state: GameState): string | undefined {
  const id = state.spielerPartei?.id;
  if (!id) return undefined;
  return SPIELER_PARTEI_TO_PROFIL[id] ?? id.toUpperCase();
}

/** Fraktions-Bereitschaft 0–100 (gleiche Logik wie bisher, für Länder-Gewichtung) */
function computeFraktionBereitschaft(
  state: GameState,
  gesetzeId: string,
  f: BundesratFraktion,
  vorstufenBonus: number,
): number {
  const law = state.gesetze.find(g => g.id === gesetzeId);
  if (!law) return 0;
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
  return Math.min(100, Math.max(0, bereitschaft));
}

function landStimmtJa(
  state: GameState,
  lawId: string,
  land: GameState['bundesrat'][0],
  fraktionBereitschaft: number,
): boolean {
  const law = state.gesetze.find(g => g.id === lawId);
  if (!law) return false;
  const felder = lawPolitikfelder(law);
  const basis = getLandBeziehung(state, land.id) / 100;
  const themenBonus = countThemenMatches(land.themen, felder) * 0.1;
  const regPartei = land.regierungPartei ?? land.party;
  const parteiBonus = regPartei && regPartei === spielerProfilPartei(state) ? 0.2 : 0;
  const lobbyTilt = Math.max(-0.12, Math.min(0.12, (fraktionBereitschaft - 50) / 150));
  const p = Math.min(0.98, Math.max(0.02, basis + themenBonus + parteiBonus + lobbyTilt));
  // Deterministisch: UI (Felder) und executeBundesratVote müssen übereinstimmen
  return p >= 0.5;
}

function findFraktionForLand(state: GameState, landId: string): BundesratFraktion | undefined {
  return state.bundesratFraktionen.find(f => f.laender.includes(landId));
}

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

  if (bundesratNutztLandgewichte(state)) {
    const gewicht = (l: GameState['bundesrat'][0]) => l.stimmgewicht ?? l.votes;
    for (const land of state.bundesrat) {
      const f = findFraktionForLand(state, land.id);
      if (!f) continue;
      const fb = computeFraktionBereitschaft(state, gesetzeId, f, vorstufenBonus);
      const stimmt = landStimmtJa(state, gesetzeId, land, fb);
      const w = gewicht(land);
      if (stimmt) ja += w;
      else nein += w;
      const b = getLandBeziehung(state, land.id);
      details.push(
        `${land.name}: ${stimmt ? 'Ja' : 'Nein'} (${w} St.) — Land-Bez. ${b}, Frakt.-Bereitschaft ${fb}%`,
      );
    }
    return {
      ja,
      nein,
      mehrheit: ja > BR_MEHRHEIT_STIMMEN,
      details,
    };
  }

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

  if (bundesratNutztLandgewichte(state)) {
    return state.bundesratFraktionen.map((f) => {
      const fb = computeFraktionBereitschaft(state, gesetzeId, f, vorstufenBonus);
      let jaW = 0;
      let neinW = 0;
      for (const lid of f.laender) {
        const land = state.bundesrat.find(l => l.id === lid);
        if (!land) continue;
        const w = land.stimmgewicht ?? land.votes;
        if (landStimmtJa(state, gesetzeId, land, fb)) jaW += w;
        else neinW += w;
      }
      const stimmtJa = jaW >= neinW;
      return {
        fraktionId: f.id,
        bereitschaft: fb,
        stimmtJa,
        laender: f.laender,
      };
    });
  }

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
  const fraktionen = state.bundesratFraktionen;
  const vorstufenBonus = state.gesetzProjekte?.[gesetzeId]?.boni?.bundesratBonus ?? 0;

  if (bundesratNutztLandgewichte(state)) {
    const result: { landId: string; fraktionId: string; color: string; stimmtJa: boolean }[] = [];
    for (const land of state.bundesrat) {
      const f = findFraktionForLand(state, land.id);
      if (!f) continue;
      const fb = computeFraktionBereitschaft(state, gesetzeId, f, vorstufenBonus);
      const stimmtJa = landStimmtJa(state, gesetzeId, land, fb);
      result.push({
        landId: land.id,
        fraktionId: f.id,
        color: f.sprecher.color,
        stimmtJa,
      });
    }
    return result;
  }

  const details = getBundesratVoteDetails(state, gesetzeId);
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

/** SMA-291: Aggregierter Zustimmungs-Prozentwert für Stufe 2 (0–100) */
export function getAggregierteZustimmung(state: GameState, gesetzeId: string): number {
  const { ja } = calcBundesratMehrheit(state, gesetzeId);
  const denom = bundesratNutztLandgewichte(state) ? BR_TOTAL_STIMMEN : 16;
  return Math.round((ja / denom) * 100);
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

const PK_BUNDESLAND_GESPRAECH = 10;
const BUNDESLAND_GESPRAECH_BEZIEHUNG = 10;

/** SMA-395: Bilaterales Gespräch — Land-Beziehung +10, leichter Fraktions-Bonus */
export function bundeslandGespraech(state: GameState, landId: string): GameState {
  if (state.pk < PK_BUNDESLAND_GESPRAECH) return state;
  const land = state.bundesrat.find(l => l.id === landId);
  if (!land) return state;

  const prev = getLandBeziehung(state, landId);
  const landBeziehungen = { ...(state.landBeziehungen ?? {}) };
  landBeziehungen[landId] = Math.min(100, prev + BUNDESLAND_GESPRAECH_BEZIEHUNG);

  let bundesratFraktionen = state.bundesratFraktionen;
  const f = findFraktionForLand(state, landId);
  if (f) {
    bundesratFraktionen = state.bundesratFraktionen.map(fr =>
      fr.id === f.id ? { ...fr, beziehung: Math.min(100, fr.beziehung + 2) } : fr,
    );
  }

  return addLog(
    {
      ...state,
      pk: state.pk - PK_BUNDESLAND_GESPRAECH,
      landBeziehungen,
      bundesratFraktionen,
    },
    `Bilaterales Gespräch mit ${land.name}: Beziehung +${BUNDESLAND_GESPRAECH_BEZIEHUNG}`,
    'g',
  );
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
  /** SMA-312: Gesetz-Relationen für Synergie-Berechnung */
  gesetzRelationen?: Record<string, import('../types').GesetzRelation[]>;
  /** SMA-390 */
  content?: ContentBundle;
}

/** Prüft ob ein Gesetz ein Einspruchsgesetz ist (Art. 77 Abs. 3/4 GG).
 *  Einspruchsgesetze können vom Bundestag mit absoluter Mehrheit überstimmt werden.
 *  Zustimmungsgesetze erfordern die Zustimmung des Bundesrats — Blockade ist endgültig. */
export function isEinspruchsgesetz(law: { zustimmungspflichtig?: boolean }): boolean {
  return law.zustimmungspflichtig === false;
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
      newState = applyMilieuEffekte(
        newState,
        lawId,
        voteContext.milieus,
        voteContext.complexity,
        voteContext.gesetzRelationen,
      );
    }
    if (law.politikfeldId) {
      newState = setPolitikfeldBeschluss(newState, law.politikfeldId);
    }
    // SMA-330: Proaktive Erfüllung bei Beschluss
    newState = checkProaktiveErfuellung(newState, lawId);
    if (voteContext?.content) {
      newState = applyGesetzMedienAkteureNachBeschluss(
        newState,
        law,
        voteContext.complexity,
        voteContext.content,
      );
    }

    return addLog(newState, `${law.kurz} im Bundesrat beschlossen — Wirkung in ${law.lag} Monaten`, 'g');
  } else {
    // Art. 77 GG: Einspruchsgesetz vs. Zustimmungsgesetz
    const complexity = voteContext?.complexity ?? 4;
    const einspruchAktiv = featureActive(complexity, 'einspruch_vs_zustimmung') && isEinspruchsgesetz(law);

    if (einspruchAktiv) {
      // Einspruchsgesetz: Bundesrat legt Einspruch ein — Bundestag kann überstimmen
      const gesetze = state.gesetze.map((g, i) =>
        i === idx ? { ...g, status: 'br_einspruch' as const, brEinspruchEingelegt: true } : g,
      );
      return addLog(
        { ...state, gesetze, ...withPause(state) },
        `${law.kurz}: Bundesrat legt Einspruch ein (Art. 77 GG). Bundestag kann mit absoluter Mehrheit überstimmen.`,
        'r',
      );
    } else {
      // Zustimmungsgesetz: endgültige Blockade — Ebenenwechsel
      const gesetze = state.gesetze.map((g, i) =>
        i === idx ? { ...g, status: 'blockiert' as const, blockiert: 'bundesrat' as const } : g,
      );
      return addLog(
        { ...state, gesetze, ...withPause(state) },
        `${law.kurz}: Bundesrat blockiert (Zustimmungsgesetz)! Ebenenwechsel möglich.`,
        'r',
      );
    }
  }
}

/**
 * Bundestag überstimmt BR-Einspruch (Art. 77 Abs. 4 GG).
 * Erfordert absolute Mehrheit der Mitglieder des Bundestags und 15 PK.
 */
export function ueberstimmeBReinspruch(
  state: GameState,
  lawId: string,
  voteContext?: BundesratVoteContext,
): GameState {
  const idx = state.gesetze.findIndex(g => g.id === lawId);
  if (idx === -1) return state;
  const law = state.gesetze[idx];
  if (law.status !== 'br_einspruch') return state;
  if (state.pk < EINSPRUCH_UEBERSTIMMUNG_PK) return state;

  // Prüfe ob absolute Mehrheit im Bundestag erreichbar (ja > 50)
  if (law.ja <= EINSPRUCH_UEBERSTIMMUNG_SCHWELLE) {
    return addLog(state, `${law.kurz}: Absolute Mehrheit im Bundestag verfehlt (${law.ja}%) — Einspruch bleibt bestehen.`, 'r');
  }

  // Überstimmung erfolgreich
  const gesetze = state.gesetze.map((g, i) =>
    i === idx ? { ...g, status: 'beschlossen' as const } : g,
  );
  let newState: GameState = { ...state, pk: state.pk - EINSPRUCH_UEBERSTIMMUNG_PK, gesetze };
  newState = applyGesetzKosten(newState, lawId);
  const lawForEffects = { effekte: law.effekte as Record<string, number>, lag: law.lag, kurz: law.kurz };
  newState = scheduleEffects(newState, lawForEffects);

  if (voteContext?.milieus) {
    newState = applyMilieuEffekte(
      newState,
      lawId,
      voteContext.milieus,
      voteContext.complexity,
      voteContext.gesetzRelationen,
    );
  }
  if (law.politikfeldId) {
    newState = setPolitikfeldBeschluss(newState, law.politikfeldId);
  }
  newState = checkProaktiveErfuellung(newState, lawId);
  if (voteContext?.content) {
    newState = applyGesetzMedienAkteureNachBeschluss(
      newState,
      law,
      voteContext.complexity,
      voteContext.content,
    );
  }

  return addLog(newState, `${law.kurz}: Bundestag überstimmt BR-Einspruch (Art. 77 GG) — Wirkung in ${law.lag} Monaten`, 'g');
}
