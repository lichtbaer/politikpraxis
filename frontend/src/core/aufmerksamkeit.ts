/**
 * Issue #270, Kriterium 3: Aufmerksamkeits-Aggregat („Braucht Aufmerksamkeit").
 *
 * Ab Stufe 3/4 verteilt sich das Spiel auf ~10 Wertdimensionen über ~11 Tabs. Ohne
 * Aggregat muss der Spieler selbst danach suchen, was gerade kippt — das widerspricht
 * dem GDD-Prinzip „Das Spiel kommt zum Spieler" (konzept.md §9.2). `misstrauensvotumWarnung`
 * in `engine.ts` war der punktuelle Vorläufer: eine Log-Zeile, die im Protokoll untergeht.
 *
 * Dieses Modul ist eine **reine Ableitung** aus dem GameState — keine neue Spielmechanik,
 * kein State-Schreibzugriff. Jede Schwelle spiegelt eine reale Engine-Bedingung wider
 * (Game-Over-Grenzen, tatsächliche PK-Kosten, die >50-%-Mehrheit im Bundestag), damit ein
 * Alert nie etwas anderes behauptet als das, was die Engine gleich tun wird.
 *
 * Stufengerechte Reduktion (Kriterium 4) entsteht auf zwei Wegen: Alerts zu Systemen, die
 * auf niedrigen Stufen gar nicht laufen (Bundesrat), können dort nicht feuern; zusätzlich
 * begrenzt `ALERT_MAX_ANZAHL` die gleichzeitig sichtbaren Einträge.
 */

import {
  ALERT_JA_PROGNOSE_KRITISCH,
  ALERT_JA_PROGNOSE_WARNUNG,
  ALERT_KOALITION_KRITISCH,
  ALERT_MAX_ANZAHL,
  ALERT_PK_KRITISCH,
  ALERT_PK_WARNUNG,
  MIN_KOALITION_FORTGANG,
  MISSTRAUENSVOTUM_EVENT_MONATE,
  MISSTRAUENSVOTUM_KOALITION_SCHWELLE,
  MISSTRAUENSVOTUM_MONATE,
} from './constants';
import { berechneJaBreakdown } from './systems/parliament/parliament';
import { hatMisstrauensvotumMehrheitsbasis } from './systems/election/election';
import { featureActive } from './systems/features';
import type { ContentBundle, GameState, ViewName } from './types';

/** Kategorie eines Alerts — deckt exakt die vier in #270 geforderten Fälle ab. */
export type AlertKategorie = 'misstrauensvotum' | 'koalition' | 'pk' | 'blockade';

/** `kritisch` = Verlust/Scheitern steht unmittelbar bevor, `warnung` = Gegensteuern lohnt jetzt. */
export type AlertStufe = 'kritisch' | 'warnung';

export interface Aufmerksamkeitsalert {
  /** Stabil über Ticks hinweg — dient als React-Key und Dedup-Schlüssel. */
  id: string;
  kategorie: AlertKategorie;
  stufe: AlertStufe;
  /** i18n-Schlüssel unter `game:aufmerksamkeit.*` (Text bleibt vollständig im UI). */
  i18nKey: string;
  /** Interpolationswerte für den i18n-Text. */
  params?: Record<string, string | number>;
  /** Tab, den ein Klick auf den Alert öffnet. */
  view: ViewName;
  /** Sortiergewicht — höher = dringender. */
  gewicht: number;
}

/** Kritische Alerts stehen immer über Warnungen, innerhalb dessen nach Gewicht. */
function sortiere(a: Aufmerksamkeitsalert, b: Aufmerksamkeitsalert): number {
  if (a.stufe !== b.stufe) return a.stufe === 'kritisch' ? -1 : 1;
  return b.gewicht - a.gewicht;
}

/**
 * Art. 67 GG: Der Zähler läuft nur, solange die Opposition eine reale Mehrheitsbasis hat,
 * und erst ab Monat 7 (siehe `tickElection`). Genau diese Bedingung wird hier gespiegelt,
 * damit die Warnung verschwindet, sobald der Zähler in der Engine zurückgesetzt wird.
 */
function misstrauensvotumAlert(state: GameState): Aufmerksamkeitsalert | null {
  if (state.month <= 6) return null;
  if (!hatMisstrauensvotumMehrheitsbasis(state)) return null;

  const lowMonths = state.lowApprovalMonths ?? 0;
  const verbleibend = Math.max(1, MISSTRAUENSVOTUM_MONATE - lowMonths);
  // Ab dem Monat, in dem der nächste Tick das Misstrauensvotum-Event auslösen kann.
  const kritisch = lowMonths + 1 >= MISSTRAUENSVOTUM_EVENT_MONATE;

  return {
    id: 'misstrauensvotum',
    kategorie: 'misstrauensvotum',
    stufe: kritisch ? 'kritisch' : 'warnung',
    i18nKey: kritisch ? 'aufmerksamkeit.misstrauensvotum.kritisch' : 'aufmerksamkeit.misstrauensvotum.warnung',
    params: { monate: verbleibend },
    view: 'bundestag',
    gewicht: 100 + lowMonths,
  };
}

/**
 * Koalitionsbruch unter MIN_KOALITION_FORTGANG beendet das Spiel — auf jeder Stufe,
 * daher ist dieser Alert bewusst nicht feature-gegated.
 */
function koalitionAlert(state: GameState): Aufmerksamkeitsalert | null {
  const coalition = state.coalition;
  if (coalition >= MISSTRAUENSVOTUM_KOALITION_SCHWELLE) return null;

  const kritisch = coalition < ALERT_KOALITION_KRITISCH;
  return {
    id: 'koalition',
    kategorie: 'koalition',
    stufe: kritisch ? 'kritisch' : 'warnung',
    i18nKey: kritisch ? 'aufmerksamkeit.koalition.kritisch' : 'aufmerksamkeit.koalition.warnung',
    params: { wert: Math.round(coalition), grenze: MIN_KOALITION_FORTGANG },
    view: 'kabinett',
    gewicht: 90 + (MISSTRAUENSVOTUM_KOALITION_SCHWELLE - coalition),
  };
}

/** PK-Knappheit, gemessen an den tatsächlichen Aktionskosten (siehe Konstanten-Doku). */
function pkAlert(state: GameState): Aufmerksamkeitsalert | null {
  const pk = state.pk;
  if (pk >= ALERT_PK_WARNUNG) return null;

  const kritisch = pk < ALERT_PK_KRITISCH;
  return {
    id: 'pk',
    kategorie: 'pk',
    stufe: kritisch ? 'kritisch' : 'warnung',
    i18nKey: kritisch ? 'aufmerksamkeit.pk.kritisch' : 'aufmerksamkeit.pk.warnung',
    params: { pk: Math.round(pk), kosten: ALERT_PK_WARNUNG },
    view: 'agenda',
    gewicht: 70 + (ALERT_PK_WARNUNG - pk),
  };
}

/**
 * Drohende Blockade: eingebrachte Gesetze, deren Ja-Prognose die Bundestags-Mehrheit
 * (>50 %) verfehlt oder nur knapp erreicht. `berechneJaBreakdown` ist dieselbe Rechnung,
 * die beim Beschluss zieht (#376) — der Alert kann daher nicht von ihr abweichen.
 */
function blockadeProgAlerts(
  state: GameState,
  complexity: number,
  content?: ContentBundle,
): Aufmerksamkeitsalert[] {
  const alerts: Aufmerksamkeitsalert[] = [];

  for (const eg of state.eingebrachteGesetze ?? []) {
    const law = state.gesetze.find((g) => g.id === eg.gesetzId);
    if (!law || law.status !== 'eingebracht') continue;

    const { effectiveJa } = berechneJaBreakdown(state, law, eg.gesetzId, complexity, {
      milieus: [],
      complexity,
      gesetzRelationen: content?.gesetzRelationen,
      content,
    });
    if (effectiveJa > ALERT_JA_PROGNOSE_WARNUNG) continue;

    const kritisch = effectiveJa <= ALERT_JA_PROGNOSE_KRITISCH;
    alerts.push({
      id: `blockade-prognose-${law.id}`,
      kategorie: 'blockade',
      stufe: kritisch ? 'kritisch' : 'warnung',
      i18nKey: kritisch
        ? 'aufmerksamkeit.blockade.prognoseKritisch'
        : 'aufmerksamkeit.blockade.prognoseWarnung',
      params: {
        gesetz: law.kurz || law.titel,
        ja: Math.round(effectiveJa),
        monate: Math.max(0, eg.abstimmungMonat - state.month),
      },
      view: 'bundestag',
      gewicht: 60 + (ALERT_JA_PROGNOSE_WARNUNG - effectiveJa),
    });
  }

  return alerts;
}

/**
 * Bereits blockierte Gesetze, die noch eine Ausweichroute oder den Vermittlungsausschuss
 * offen haben. Ohne Hinweis versanden sie stillschweigend in der Agenda.
 */
function blockadeBestandAlerts(state: GameState): Aufmerksamkeitsalert[] {
  const blockiert = state.gesetze.filter(
    (g) => g.status === 'blockiert' || g.status === 'br_einspruch',
  );
  if (blockiert.length === 0) return [];

  const erstes = blockiert[0];
  return [
    {
      id: 'blockade-bestand',
      kategorie: 'blockade',
      stufe: 'warnung',
      i18nKey:
        blockiert.length === 1
          ? 'aufmerksamkeit.blockade.bestandEins'
          : 'aufmerksamkeit.blockade.bestandMehrere',
      params: { gesetz: erstes.kurz || erstes.titel, anzahl: blockiert.length },
      view: 'agenda',
      gewicht: 50 + blockiert.length,
    },
  ];
}

/**
 * Sammelt alle offenen Aufmerksamkeitspunkte, sortiert nach Dringlichkeit und auf die
 * für die Komplexitätsstufe zulässige Anzahl gekürzt.
 *
 * Rein lesend — der GameState wird nicht verändert.
 */
export function berechneAufmerksamkeit(
  state: GameState,
  complexity: number,
  content?: ContentBundle,
): Aufmerksamkeitsalert[] {
  if (state.gameOver) return [];

  const alerts: Aufmerksamkeitsalert[] = [];

  const misstrauen = misstrauensvotumAlert(state);
  if (misstrauen) alerts.push(misstrauen);

  const koalition = koalitionAlert(state);
  if (koalition) alerts.push(koalition);

  const pk = pkAlert(state);
  if (pk) alerts.push(pk);

  // Die Ja-Prognose ist erst aussagekräftig, wenn Gesetze überhaupt mit Verzögerung
  // abgestimmt werden; auf Stufe 1 greift dieselbe Rechnung, nur mit weniger Modifikatoren.
  alerts.push(...blockadeProgAlerts(state, complexity, content));

  // Bundesrats-Blockaden existieren erst, wenn der Bundesrat überhaupt mitspielt.
  if (featureActive(complexity, 'bundesrat_sichtbar') || state.gesetze.some((g) => g.blockiert === 'bundestag')) {
    alerts.push(...blockadeBestandAlerts(state));
  }

  const max = ALERT_MAX_ANZAHL[complexity] ?? ALERT_MAX_ANZAHL[4];
  return alerts.sort(sortiere).slice(0, max);
}
