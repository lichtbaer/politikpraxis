/**
 * Bundestag: Sitzverteilung (SMA-344) — 600 Sitze, fiktive Fraktionen inkl. passiver NF.
 */
import type { Ideologie } from '../core/types';
import { BUNDESTAG_SITZE } from '../core/constants';
import { SPIELBARE_PARTEIEN } from '../data/defaults/parteien';

export const BUNDESTAG_SITZE_GESAMT = BUNDESTAG_SITZE;

/** Fixer Anteil der Nationalen Front (passiv, keine Kooperation) */
export const NF_BUNDESTAG_ANTEIL = 0.12;

/** Referenz-Ideologie für NF (rechtspopulistisch/konservativ) — für Kongruenz/Medien-Effekte */
export const NF_IDEOLOGIE_REF: Ideologie = {
  wirtschaft: 45,
  gesellschaft: 58,
  staat: 72,
};

export const NF_FRAKTION_FARBE = '#8B0000';

export interface FraktionSitze {
  id: string;
  name: string;
  sitze: number;
  prozent: number;
  farbe: string;
  passiv?: boolean;
}

export function getParteifarbe(parteiId: string): string {
  return SPIELBARE_PARTEIEN.find((p) => p.id === parteiId)?.farbe ?? '#888888';
}

/**
 * Sitzverteilung: Koalition (Spieler + Partner), Opposition (Rest), NF fix ~12 %.
 * Rundungen so, dass die Summe exakt BUNDESTAG_SITZE_GESAMT bleibt.
 */
export function berechneSitzverteilung(
  spielerKuerzel: string,
  koalitionspartnerKuerzel: string | null,
  koalitionsAnteil: number,
  spielerParteiId: string,
): FraktionSitze[] {
  const nfSitze = Math.round(BUNDESTAG_SITZE_GESAMT * NF_BUNDESTAG_ANTEIL);
  let koalitionSitze = Math.round(BUNDESTAG_SITZE_GESAMT * koalitionsAnteil);
  let oppositionSitze = BUNDESTAG_SITZE_GESAMT - koalitionSitze - nfSitze;

  if (oppositionSitze < 0) {
    koalitionSitze += oppositionSitze;
    oppositionSitze = 0;
  }

  const koalitionName = koalitionspartnerKuerzel
    ? `${spielerKuerzel} + ${koalitionspartnerKuerzel}`
    : spielerKuerzel;

  const koalitionsAnteilEffektiv = koalitionSitze / BUNDESTAG_SITZE_GESAMT;

  return [
    {
      id: 'opposition',
      name: 'Opposition',
      sitze: oppositionSitze,
      prozent: (oppositionSitze / BUNDESTAG_SITZE_GESAMT) * 100,
      farbe: '#555555',
    },
    {
      id: 'koalition',
      name: koalitionName,
      sitze: koalitionSitze,
      prozent: koalitionsAnteilEffektiv * 100,
      farbe: getParteifarbe(spielerParteiId),
    },
    {
      id: 'nf',
      name: 'Nationale Front',
      sitze: nfSitze,
      prozent: NF_BUNDESTAG_ANTEIL * 100,
      farbe: NF_FRAKTION_FARBE,
      passiv: true,
    },
  ];
}
