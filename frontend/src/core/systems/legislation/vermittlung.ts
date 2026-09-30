/**
 * Vermittlungsausschuss-Mechanik (Art. 77 GG).
 *
 * Anrufung durch den Spieler (Bundesregierung): Wird ein Gesetz im Bundesrat
 * blockiert (oder legt der Bundesrat Einspruch ein), kann der Spieler den
 * Vermittlungsausschuss einberufen (20 PK). Der Ausgang ist offen und wird
 * bei Einberufung ausgewürfelt, gekoppelt an die durchschnittliche Beziehung
 * zu den Bundesrats-Fraktionen und abgelehnte Trade-off-Angebote:
 * voller Erfolg (Originaleffekte), Kompromiss (50% Effekte) oder Scheitern
 * (Bundesrat-Blockade bzw. Einspruch beim Einspruchsgesetz, PK verloren).
 * Nach 2 Monaten wird der vorab bestimmte Ausgang im Tick aufgelöst.
 *
 * Anrufung durch den Bundesrat (#276, z. B. Kohl-Sonderregel): Das Gesetz liegt
 * noch zur Abstimmung im Bundesrat (`bt_passed`); die Abstimmung verschiebt sich
 * um 2 Monate. Der Ausgang wird erst bei Fristende ausgewürfelt, damit die
 * Reaktion des Spielers und Lobbying in der Zwischenzeit (Beziehungen) zählen.
 * Einigung/Kompromiss → erneute Bundesratsabstimmung, Scheitern → Blockade bzw.
 * Einspruch (vom Bundestag überstimmbar).
 */
import type { GameState, Law, LawEffects, ContentBundle } from '../../types';
import { addLog } from '../../engine';
import { verbrauchePK } from '../../pk';
import { withPause } from '../../eventPause';
import { scheduleEffects } from '../economics/economy';
import { applyGesetzKosten } from '../economics/haushalt';
import { applyMilieuEffekte } from '../medien/milieus';
import { setPolitikfeldBeschluss } from '../parliament/politikfeldDruck';
import { checkProaktiveErfuellung } from '../kabinett/ministerAgenden';
import { featureActive } from '../features';
import { isEinspruchsgesetz } from '../institutions/bundesrat';
import { applyGesetzMedienAkteureNachBeschluss } from '../medien/medienEvents';
import { nextRandom } from '../../rng';

const PK_VERMITTLUNG = 20;
const VERMITTLUNG_DELAY_MONATE = 2;
const EFFEKT_FAKTOR = 0.5;

/** Ausgang des Vermittlungsausschusses */
export type VermittlungAusgang = 'erfolg' | 'kompromiss' | 'scheitern';

/** Basis-Wahrscheinlichkeit für Erfolg/Scheitern bei völlig neutraler Beziehung (score 0.5) */
const VERMITTLUNG_PROB_BASIS = 0.15;
/** Spannweite, um die Erfolgs-/Scheitern-Chance je nach Beziehungs-Score verschoben wird */
const VERMITTLUNG_PROB_SPREAD = 0.6;
/** Abzug auf den Beziehungs-Score je abgelehntem Trade-off-Angebot einer BR-Fraktion */
const VERMITTLUNG_TRADEOFF_MALUS = 0.15;
/**
 * #276: Anteil der Beziehung zur anrufenden BR-Fraktion am Score, wenn der Bundesrat
 * den Ausschuss selbst angerufen hat — wer anruft, muss für eine Einigung gewonnen werden.
 */
const VERMITTLUNG_ANRUFER_GEWICHT = 0.5;

/**
 * Beziehungs-Score (0–1) als Basis für die Ausgangs-Chancen: Durchschnitt der
 * Fraktions-Beziehungen, abzüglich eines Malus je abgelehntem Trade-off-Angebot
 * für dieses Gesetz. Hat der Bundesrat den Ausschuss angerufen, geht die
 * Beziehung zur anrufenden Fraktion zur Hälfte gesondert ein.
 */
function berechneVermittlungsScore(state: GameState, lawId: string): number {
  const fraktionen = state.bundesratFraktionen ?? [];
  if (fraktionen.length === 0) return 0.5;
  const law = state.gesetze.find(g => g.id === lawId);
  let summe = 0;
  let ablehnungen = 0;
  for (const f of fraktionen) {
    summe += f.beziehung;
    if (law?.lobbyFraktionen?.[f.id]?.tradeoffAblehnen) ablehnungen++;
  }
  let basis = summe / fraktionen.length / 100;
  const anruferId = state.vermittlungAnrufer?.[lawId];
  const anrufer = anruferId != null ? fraktionen.find(f => f.id === anruferId) : undefined;
  if (anrufer) {
    basis = (1 - VERMITTLUNG_ANRUFER_GEWICHT) * basis + VERMITTLUNG_ANRUFER_GEWICHT * (anrufer.beziehung / 100);
  }
  return Math.max(0, Math.min(1, basis - ablehnungen * VERMITTLUNG_TRADEOFF_MALUS));
}

/**
 * Wahrscheinlichkeiten für die drei möglichen Ausgänge, gekoppelt an die
 * BR-Fraktions-Beziehungen (SMA-276). Bei neutraler Beziehung (score 0.5)
 * ergibt sich ein offener Ausgang (~45/45/10); je besser/schlechter die
 * Beziehung, desto mehr verschiebt sich die Chance Richtung Erfolg/Scheitern.
 */
export function berechneVermittlungsChancen(
  state: GameState,
  lawId: string,
): Record<VermittlungAusgang, number> {
  const score = berechneVermittlungsScore(state, lawId);
  const erfolg = VERMITTLUNG_PROB_BASIS + VERMITTLUNG_PROB_SPREAD * score;
  const scheitern = VERMITTLUNG_PROB_BASIS + VERMITTLUNG_PROB_SPREAD * (1 - score);
  const kompromiss = Math.max(0, 1 - erfolg - scheitern);
  return { erfolg, kompromiss, scheitern };
}

/** Würfelt den Ausgang anhand der Chancen aus (kumulative Verteilung) */
function wuerfleVermittlungsAusgang(chancen: Record<VermittlungAusgang, number>): VermittlungAusgang {
  const r = nextRandom();
  if (r < chancen.erfolg) return 'erfolg';
  if (r < chancen.erfolg + chancen.kompromiss) return 'kompromiss';
  return 'scheitern';
}

/**
 * Ermittelt die Fraktionen, die für die narrative Inszenierung des Ausgangs
 * benannt werden (SMA-276, AC „narrativ inszeniert"): die BR-Fraktion mit der
 * schlechtesten Beziehung (bzw. eine, die für dieses Gesetz explizit ein
 * Trade-off-Angebot abgelehnt hat) gilt als Blockiererin; die Fraktion mit der
 * besten Beziehung als Vermittlerin.
 */
function bestimmeVermittlungsAkteure(
  state: GameState,
  lawId: string,
): { blockierend?: string; vermittelnd?: string } {
  const fraktionen = state.bundesratFraktionen ?? [];
  if (fraktionen.length === 0) return {};
  const law = state.gesetze.find(g => g.id === lawId);
  const sortiert = [...fraktionen].sort((a, b) => a.beziehung - b.beziehung);
  const explizitAblehnend = fraktionen.find(f => law?.lobbyFraktionen?.[f.id]?.tradeoffAblehnen);
  const blockierend = (explizitAblehnend ?? sortiert[0]).name;
  const vermittelnd = sortiert[sortiert.length - 1].name;
  return { blockierend, vermittelnd };
}

/** Formuliert die Ausgangs-Log-Meldung inkl. der beteiligten Fraktionen, wo bekannt. */
function formatiereVermittlungsLog(
  ausgang: VermittlungAusgang,
  lawKurz: string,
  akteure: { blockierend?: string; vermittelnd?: string },
): string {
  if (ausgang === 'scheitern') {
    return akteure.blockierend
      ? `Vermittlungsausschuss: ${lawKurz} gescheitert — ${akteure.blockierend} blockiert weiterhin`
      : `Vermittlungsausschuss: ${lawKurz} gescheitert — der Bundesrat bleibt bei seiner Ablehnung`;
  }
  if (ausgang === 'erfolg') {
    return akteure.vermittelnd
      ? `Vermittlungsausschuss: ${lawKurz} mit vollem Erfolg beschlossen (Wirkung 100%) — ${akteure.vermittelnd} hat vermittelt`
      : `Vermittlungsausschuss: ${lawKurz} mit vollem Erfolg beschlossen (Wirkung 100%)`;
  }
  return akteure.vermittelnd && akteure.blockierend && akteure.vermittelnd !== akteure.blockierend
    ? `Vermittlungsausschuss: ${lawKurz} als Kompromiss beschlossen (Wirkung −50%) — zwischen ${akteure.vermittelnd} und ${akteure.blockierend}`
    : `Vermittlungsausschuss: ${lawKurz} als Kompromiss beschlossen (Wirkung −50%)`;
}

/** Prüft ob Vermittlungsausschuss für ein Gesetz möglich ist */
export function kannVermitteln(state: GameState, lawId: string, complexity: number): boolean {
  if (!featureActive(complexity, 'vermittlungsausschuss')) return false;
  const law = state.gesetze.find(g => g.id === lawId);
  if (!law) return false;
  // Nur bei Bundesrat-Blockade (Zustimmungsgesetz) oder Einspruch (Einspruchsgesetz)
  if (law.blockiert !== 'bundesrat' && law.status !== 'br_einspruch') return false;
  // Nicht wenn bereits in Vermittlung
  if (state.vermittlungAktiv?.[lawId] != null) return false;
  // Genug PK?
  if (state.pk < PK_VERMITTLUNG) return false;
  return true;
}

/**
 * Startet den Vermittlungsausschuss — der Ausgang (Erfolg/Kompromiss/Scheitern) wird
 * hier bereits ausgewürfelt (gekoppelt an BR-Fraktions-Beziehungen) und erst nach
 * 2 Monaten im Tick aufgelöst; der Spieler erfährt das Ergebnis erst dann.
 */
export function vermittlungsausschuss(state: GameState, lawId: string, complexity: number): GameState {
  if (!kannVermitteln(state, lawId, complexity)) return state;

  const next = verbrauchePK(state, PK_VERMITTLUNG);
  if (!next) return state;

  // Gesetz-Status auf 'eingebracht' (in Vermittlung) setzen, Blockade aufheben
  const gesetze = next.gesetze.map(g =>
    g.id === lawId
      ? { ...g, status: 'eingebracht' as const, blockiert: null }
      : g,
  );

  const vermittlungAktiv = {
    ...(next.vermittlungAktiv ?? {}),
    [lawId]: next.month + VERMITTLUNG_DELAY_MONATE,
  };
  const ausgang = wuerfleVermittlungsAusgang(berechneVermittlungsChancen(next, lawId));
  const vermittlungAusgang = {
    ...(next.vermittlungAusgang ?? {}),
    [lawId]: ausgang,
  };

  const law = state.gesetze.find(g => g.id === lawId);
  return addLog(
    { ...next, gesetze, vermittlungAktiv, vermittlungAusgang },
    `Vermittlungsausschuss für ${law?.kurz ?? lawId} einberufen: Ausgang offen, Ergebnis in ${VERMITTLUNG_DELAY_MONATE} Monaten`,
    'info',
  );
}

/**
 * #276 AC3: Der Bundesrat ruft von sich aus den Vermittlungsausschuss an (Art. 77 Abs. 2 GG),
 * z. B. über die Kohl-Sonderregel. Nur für Gesetze, die noch auf die Bundesratsabstimmung
 * warten (`bt_passed`). Keine PK-Kosten für den Spieler; die Abstimmung verschiebt sich um
 * {@link VERMITTLUNG_DELAY_MONATE} Monate auf das Fristende. Der Ausgang wird bewusst erst
 * dann ausgewürfelt (siehe {@link tickVermittlungsausschuss}).
 *
 * Feature-Gating: Aufrufer ist `checkBundesratEvents` (Feature `bundesrat_sichtbar`,
 * ab Stufe 2 — dieselbe Stufe wie `vermittlungsausschuss`).
 */
export function bundesratRuftVermittlungAn(state: GameState, lawId: string, fraktionId: string): GameState {
  const law = state.gesetze.find(g => g.id === lawId);
  if (!law || law.status !== 'bt_passed') return state;
  if (state.vermittlungAktiv?.[lawId] != null) return state;

  const frist = Math.max(state.month, law.brVoteMonth ?? state.month) + VERMITTLUNG_DELAY_MONATE;
  const gesetze = state.gesetze.map(g => (g.id === lawId ? { ...g, brVoteMonth: frist } : g));
  const anrufer = state.bundesratFraktionen.find(f => f.id === fraktionId)?.name ?? fraktionId;

  return addLog(
    {
      ...state,
      gesetze,
      vermittlungAktiv: { ...(state.vermittlungAktiv ?? {}), [lawId]: frist },
      vermittlungAnrufer: { ...(state.vermittlungAnrufer ?? {}), [lawId]: fraktionId },
    },
    'game:bundesrat.logVermittlungAngerufen',
    'r',
    { anrufer, gesetz: law.kurz, monate: frist - state.month },
  );
}

/**
 * Gescheiterte Vermittlung: Beim Einspruchsgesetz legt der Bundesrat Einspruch ein
 * (vom Bundestag mit absoluter Mehrheit überstimmbar, #278), sonst bleibt/wird das
 * Gesetz im Bundesrat blockiert (Zustimmungsgesetz).
 */
function nachGescheiterterVermittlung(law: Law, einspruch: boolean): Law {
  return einspruch
    ? { ...law, status: 'br_einspruch', blockiert: null, brEinspruchEingelegt: true }
    : { ...law, status: 'blockiert', blockiert: 'bundesrat' };
}

function istEinspruchAktiv(law: Law, complexity: number | undefined): boolean {
  return featureActive(complexity ?? 4, 'einspruch_vs_zustimmung') && isEinspruchsgesetz(law);
}

/**
 * #276 AC3: Löst eine vom Bundesrat angerufene Vermittlung auf. Der Ausgang wird erst jetzt
 * ausgewürfelt — auf Basis der aktuellen Beziehungen inkl. der anrufenden Fraktion.
 * Einigung (voll oder als Kompromiss mit halben Effekten) → das Gesetz geht erneut in den
 * Bundesrat, die Abstimmung folgt noch in diesem Monat. Scheitern → Blockade bzw. Einspruch.
 */
function loeseBundesratVermittlungAuf(
  state: GameState,
  lawIdx: number,
  anruferId: string,
  complexity: number | undefined,
): GameState {
  const law = state.gesetze[lawIdx];
  // Gesetz hat das Bundesratsverfahren inzwischen anders verlassen → Verfahren erledigt sich
  if (law.status !== 'bt_passed') return state;
  const ausgang = wuerfleVermittlungsAusgang(berechneVermittlungsChancen(state, law.id));
  const params = {
    gesetz: law.kurz,
    anrufer: state.bundesratFraktionen.find(f => f.id === anruferId)?.name ?? anruferId,
  };

  if (ausgang === 'scheitern') {
    const einspruch = istEinspruchAktiv(law, complexity);
    const gesetze = state.gesetze.map((g, i) => (i === lawIdx ? nachGescheiterterVermittlung(g, einspruch) : g));
    return addLog(
      { ...state, gesetze, ...withPause(state) },
      einspruch ? 'game:bundesrat.logVermittlungGescheitertEinspruch' : 'game:bundesrat.logVermittlungGescheitert',
      'r',
      params,
    );
  }

  const kompromiss = ausgang === 'kompromiss';
  const gesetze = state.gesetze.map((g, i) => {
    if (i !== lawIdx) return g;
    const neu = { ...g, brVoteMonth: state.month };
    return kompromiss
      ? { ...neu, effekte: reduziereEffekte(g.effekte), wirkungFaktor: (g.wirkungFaktor ?? 1) * EFFEKT_FAKTOR }
      : neu;
  });
  return addLog(
    { ...state, gesetze },
    kompromiss ? 'game:bundesrat.logVermittlungKompromiss' : 'game:bundesrat.logVermittlungEinigung',
    'g',
    params,
  );
}

/** Reduziert Law-Effekte um Faktor (für vermitteltes Gesetz) */
function reduziereEffekte(effekte: LawEffects): LawEffects {
  const result: LawEffects = {};
  for (const [key, val] of Object.entries(effekte)) {
    if (val != null) {
      result[key as keyof LawEffects] = +(val * EFFEKT_FAKTOR).toFixed(2);
    }
  }
  return result;
}

/**
 * Tick-Check: Vermittlungsausschuss abschließen wenn Frist erreicht.
 * Wird im Engine-Tick (Phase 2, vor den Bundesratsabstimmungen in Phase 4) aufgerufen:
 * Vom Spieler angerufene Verfahren enden mit dem vorab gewürfelten Ausgang (Beschluss
 * oder Scheitern), vom Bundesrat angerufene würfeln jetzt und gehen bei Einigung noch im
 * selben Monat erneut in die Bundesratsabstimmung.
 */
export function tickVermittlungsausschuss(
  state: GameState,
  context?: {
    milieus?: { id: string; ideologie: { wirtschaft: number; gesellschaft: number; staat: number }; min_complexity: number }[];
    complexity?: number;
    gesetzRelationen?: Record<string, import('../../types').GesetzRelation[]>;
    content?: ContentBundle;
  },
): GameState {
  const aktiv = state.vermittlungAktiv;
  if (!aktiv || Object.keys(aktiv).length === 0) return state;

  let s = state;
  const verbleibend: Record<string, number> = {};
  const ausgangVerbleibend: Record<string, VermittlungAusgang> = {};
  const anruferVerbleibend: Record<string, string> = {};

  for (const [lawId, fristMonat] of Object.entries(aktiv)) {
    const anruferId = s.vermittlungAnrufer?.[lawId];
    if (s.month < fristMonat) {
      verbleibend[lawId] = fristMonat;
      const bestehenderAusgang = s.vermittlungAusgang?.[lawId];
      if (bestehenderAusgang) ausgangVerbleibend[lawId] = bestehenderAusgang;
      if (anruferId != null) anruferVerbleibend[lawId] = anruferId;
      continue;
    }

    const lawIdx = s.gesetze.findIndex(g => g.id === lawId);
    if (lawIdx === -1) continue;

    // #276 AC3: Vom Bundesrat angerufen → Ausgang erst jetzt würfeln, danach erneute BR-Abstimmung
    if (anruferId != null) {
      s = loeseBundesratVermittlungAuf(s, lawIdx, anruferId, context?.complexity);
      continue;
    }

    const law = s.gesetze[lawIdx];
    // Fehlender Eintrag (z.B. Spielstand vor SMA-276) -> 'kompromiss' als bisheriges Standardverhalten
    const ausgang: VermittlungAusgang = s.vermittlungAusgang?.[lawId] ?? 'kompromiss';
    const akteure = bestimmeVermittlungsAkteure(s, lawId);

    if (ausgang === 'scheitern') {
      // Vermittlung gescheitert, keine Effekte/Kosten: Zustimmungsgesetz fällt zurück in die
      // Bundesrat-Blockade, beim Einspruchsgesetz bleibt der Einspruch (überstimmbar) bestehen.
      const einspruch = istEinspruchAktiv(law, context?.complexity);
      const gesetze = s.gesetze.map((g, i) => (i === lawIdx ? nachGescheiterterVermittlung(g, einspruch) : g));
      s = { ...s, gesetze };
      s = addLog(s, formatiereVermittlungsLog('scheitern', law.kurz, akteure), 'r');
      continue;
    }

    // Faktor multiplikativ: ein bereits (z. B. durch eine BR-Vermittlung) verwässertes Gesetz bleibt verwässert
    const wirkungFaktor = (law.wirkungFaktor ?? 1) * (ausgang === 'erfolg' ? 1 : EFFEKT_FAKTOR);
    const vermittelteEffekte = ausgang === 'erfolg' ? law.effekte : reduziereEffekte(law.effekte);

    const gesetze = s.gesetze.map((g, i) =>
      i === lawIdx
        ? { ...g, status: 'beschlossen' as const, effekte: vermittelteEffekte, wirkungFaktor }
        : g,
    );
    s = { ...s, gesetze };

    // Kosten und Effekte anwenden
    s = applyGesetzKosten(s, lawId);
    s = scheduleEffects(s, {
      effekte: vermittelteEffekte as Record<string, number>,
      lag: law.lag,
      kurz: `${law.kurz} (Vermittlung)`,
      gesetzId: lawId,
    });

    if (context?.milieus && context.complexity != null) {
      s = applyMilieuEffekte(s, lawId, context.milieus, context.complexity, context.gesetzRelationen);
    }
    if (law.politikfeldId) {
      s = setPolitikfeldBeschluss(s, law.politikfeldId);
    }
    s = checkProaktiveErfuellung(s, lawId);
    if (context?.content != null && context.complexity != null) {
      const lawNow = s.gesetze[lawIdx];
      s = applyGesetzMedienAkteureNachBeschluss(s, lawNow, context.complexity, context.content);
    }

    s = addLog(s, formatiereVermittlungsLog(ausgang, law.kurz, akteure), 'g');
  }

  s = {
    ...s,
    vermittlungAktiv: Object.keys(verbleibend).length > 0 ? verbleibend : undefined,
    vermittlungAusgang: Object.keys(ausgangVerbleibend).length > 0 ? ausgangVerbleibend : undefined,
    vermittlungAnrufer: Object.keys(anruferVerbleibend).length > 0 ? anruferVerbleibend : undefined,
  };
  return s;
}
