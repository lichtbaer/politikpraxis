/**
 * Issue #266: Leichtes Verhältniswahl-Modell für die Wahlnacht (Stufe 3/4).
 *
 * Übersetzt das eigene Wahlergebnis (Zustimmungswert) in ein plausibles
 * Fünf-Parteien-Ergebnis samt 5-%-Sperrklausel und zeigt mögliche
 * Koalitionen danach. Dies ist eine narrative Auswertung, KEINE zweite
 * Simulation — die bestehende Sieg-/Score-Logik (Dreipfeiler, spielziel.ts)
 * bleibt unverändert siegentscheidend.
 */
import type { GameState } from '../../types';
import type { KoalitionspartnerParteiId } from '../../types/politics';
import { ALLE_PARTEIEN } from '../../../data/defaults/koalitionspartner';
import { berechneKongruenz } from '../../ideologie';

export const WAHLNACHT_SPERRKLAUSEL_PROZENT = 5;

/** Anteil, der pauschal an nicht modellierte Kleinstparteien geht (vor Klima-Anpassung) */
const SONSTIGE_BASIS_ANTEIL = 8;

export type WahlnachtParteiRolle = 'regierung' | 'koalitionspartner' | 'opposition' | 'ausserparlamentarisch';

export interface WahlnachtParteiErgebnis {
  id: KoalitionspartnerParteiId | 'sonstige';
  name: string;
  kuerzel: string;
  /** Rohes Stimmenergebnis in %, Summe über alle Einträge = 100 */
  stimmenanteil: number;
  /** Sitzanteil im (fiktiven) Bundestag nach Anwendung der 5-%-Hürde; 0 wenn nicht über Hürde */
  sitzanteil: number;
  ueberHuerde: boolean;
  rolle: WahlnachtParteiRolle;
}

export interface WahlnachtKoalitionsOption {
  partnerIds: KoalitionspartnerParteiId[];
  partnerNamen: string[];
  sitzanteilSumme: number;
  mehrheitsfaehig: boolean;
  durchschnittlicheKongruenz: number;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function mean(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

/** Rundet Prozentwerte auf 1 Nachkommastelle, Summe bleibt exakt 100 (größte Reste zuerst). */
function rundeAufHundert(werte: number[]): number[] {
  const skaliert = werte.map((w) => w * 10);
  const abgerundet = skaliert.map((w) => Math.floor(w));
  let rest = Math.round(1000 - abgerundet.reduce((s, w) => s + w, 0));
  const resteIdx = skaliert
    .map((w, i) => ({ i, rest: w - abgerundet[i] }))
    .sort((a, b) => b.rest - a.rest);
  const ergebnis = [...abgerundet];
  for (let k = 0; k < resteIdx.length && rest > 0; k++, rest--) {
    ergebnis[resteIdx[k].i] += 1;
  }
  return ergebnis.map((w) => Math.round(w) / 10);
}

/**
 * Übersetzt das Wahlergebnis (Zustimmungswert) in ein Fünf-Parteien-Ergebnis
 * (Spielerpartei + Koalitionspartner + 3 weitere Parteien) plus „Sonstige“.
 * „Sonstige“ steht stellvertretend für alle nicht modellierten Kleinstparteien
 * und liegt daher konzeptionell immer unter der Sperrklausel.
 */
export function berechneWahlnachtParteienErgebnis(
  state: GameState,
  wahlergebnis: number,
): WahlnachtParteiErgebnis[] {
  const spielerPartei = state.spielerPartei;
  if (!spielerPartei) return [];

  const spielerEntry = ALLE_PARTEIEN.find((p) => p.id === spielerPartei.id);
  const partnerId = state.koalitionspartner?.id;
  const kvErfuellung = clamp((state.koalitionspartner?.koalitionsvertragScore ?? 50) / 100, 0, 1);
  const medienKlima = state.medienKlima ?? 50;

  const spielerAnteil = clamp(wahlergebnis, 4, 49);
  const sonstigeAnteil = clamp(SONSTIGE_BASIS_ANTEIL + (50 - medienKlima) * 0.1, 3, 16);
  const restBudget = Math.max(0, 100 - spielerAnteil - sonstigeAnteil);

  const andere = ALLE_PARTEIEN.filter((p) => p.id !== spielerPartei.id);
  const gewichte = andere.map((p) => {
    const kongruenz = spielerEntry ? berechneKongruenz(spielerEntry.ideologie, p.ideologie) : 50;
    // Ideologisch nahe Parteien erhalten mehr vom Rest-Budget; nie 0, damit jede Partei
    // eine (kleine) Chance auf die Sperrklausel hat.
    let gewicht = Math.max(5, kongruenz);
    if (p.id === partnerId) {
      // Gute Koalitionsführung stärkt sichtbar den amtierenden Partner.
      gewicht *= 1 + kvErfuellung;
    }
    return { partei: p, gewicht };
  });
  const gewichteSumme = gewichte.reduce((s, g) => s + g.gewicht, 0) || 1;

  const rohEintraege: Array<{
    id: KoalitionspartnerParteiId | 'sonstige';
    name: string;
    kuerzel: string;
    anteil: number;
    rolle: WahlnachtParteiRolle;
  }> = [
    { id: spielerPartei.id, name: spielerPartei.name, kuerzel: spielerPartei.kuerzel, anteil: spielerAnteil, rolle: 'regierung' },
    ...gewichte.map(({ partei, gewicht }) => ({
      id: partei.id,
      name: partei.name,
      kuerzel: partei.kuerzel,
      anteil: (gewicht / gewichteSumme) * restBudget,
      rolle: (partei.id === partnerId ? 'koalitionspartner' : 'opposition') as WahlnachtParteiRolle,
    })),
    { id: 'sonstige', name: 'Sonstige', kuerzel: 'SO', anteil: sonstigeAnteil, rolle: 'ausserparlamentarisch' },
  ];

  const gerundet = rundeAufHundert(rohEintraege.map((e) => e.anteil));
  const mitHuerde = rohEintraege.map((e, i) => ({
    ...e,
    stimmenanteil: gerundet[i],
    // "Sonstige" bündelt per Definition Parteien unter der Sperrklausel.
    ueberHuerde: e.id !== 'sonstige' && gerundet[i] >= WAHLNACHT_SPERRKLAUSEL_PROZENT,
  }));

  const stimmenUeberHuerde = mitHuerde
    .filter((e) => e.ueberHuerde)
    .reduce((sum, e) => sum + e.stimmenanteil, 0) || 1;

  return mitHuerde.map((e) => ({
    id: e.id,
    name: e.name,
    kuerzel: e.kuerzel,
    stimmenanteil: e.stimmenanteil,
    sitzanteil: e.ueberHuerde ? Math.round((e.stimmenanteil / stimmenUeberHuerde) * 1000) / 10 : 0,
    ueberHuerde: e.ueberHuerde,
    rolle: e.rolle,
  }));
}

/**
 * Mögliche Koalitionen nach der Wahl aus den Parteien, die die Sperrklausel
 * übersprungen haben. Nutzt dieselbe Ideologie-Kongruenz wie
 * `berechneKoalitionspartner` (koalition.ts) zur Bewertung der Optionen.
 * Liefert bis zu 5 Optionen, mehrheitsfähige zuerst, danach kleinere vor
 * größeren Koalitionen und höhere vor niedrigerer Kongruenz.
 */
export function berechneWahlnachtKoalitionsoptionen(
  ergebnisse: WahlnachtParteiErgebnis[],
): WahlnachtKoalitionsOption[] {
  const spieler = ergebnisse.find((e) => e.rolle === 'regierung');
  if (!spieler) return [];

  const spielerEntry = ALLE_PARTEIEN.find((p) => p.id === spieler.id);
  const kandidaten = ergebnisse.filter((e) => e.ueberHuerde && e.rolle !== 'regierung');

  const kongruenzZu = (id: string): number => {
    const gegenpartei = ALLE_PARTEIEN.find((p) => p.id === id);
    if (!spielerEntry || !gegenpartei) return 50;
    return berechneKongruenz(spielerEntry.ideologie, gegenpartei.ideologie);
  };

  const bauOption = (partner: WahlnachtParteiErgebnis[]): WahlnachtKoalitionsOption => {
    const sitzanteilSumme =
      Math.round((spieler.sitzanteil + partner.reduce((s, p) => s + p.sitzanteil, 0)) * 10) / 10;
    return {
      partnerIds: partner.map((p) => p.id as KoalitionspartnerParteiId),
      partnerNamen: partner.map((p) => p.name),
      sitzanteilSumme,
      mehrheitsfaehig: sitzanteilSumme > 50,
      durchschnittlicheKongruenz: Math.round(mean(partner.map((p) => kongruenzZu(p.id)))),
    };
  };

  const optionen = kandidaten.map((partner) => bauOption([partner]));

  // Reicht kein Einzelpartner für die Mehrheit, zusätzlich Dreier-Koalitionen anbieten.
  if (!optionen.some((o) => o.mehrheitsfaehig)) {
    for (let i = 0; i < kandidaten.length; i++) {
      for (let j = i + 1; j < kandidaten.length; j++) {
        optionen.push(bauOption([kandidaten[i], kandidaten[j]]));
      }
    }
  }

  return optionen
    .sort((a, b) => {
      if (a.mehrheitsfaehig !== b.mehrheitsfaehig) return a.mehrheitsfaehig ? -1 : 1;
      if (a.partnerIds.length !== b.partnerIds.length) return a.partnerIds.length - b.partnerIds.length;
      return b.durchschnittlicheKongruenz - a.durchschnittlicheKongruenz;
    })
    .slice(0, 5);
}
