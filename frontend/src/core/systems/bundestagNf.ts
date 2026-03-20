/**
 * SMA-344: Passive NF-Präsenz im Bundestag — Overton-Fenster (BT-Stimmen), Medienkongruenz.
 */
import type { Law } from '../types';
import { berechneKongruenz } from '../ideologie';
import { NF_IDEOLOGIE_REF } from '../../constants/bundestag';

/** Ab dieser Kongruenz mit NF-Profil: Medienklima-Malus bei Beschluss */
export const NF_KONGRUENZ_MEDIEN_SCHWELLE = 72;

function isProgressivNfGegner(law: Law): boolean {
  const g = law.ideologie?.gesellschaft ?? 0;
  const s = law.ideologie?.staat ?? 0;
  return g < -10 || (g < 15 && s < -28);
}

function isKonservativNfMitlauf(law: Law): boolean {
  const g = law.ideologie?.gesellschaft ?? 0;
  const s = law.ideologie?.staat ?? 0;
  return g > 10 || (s > 36 && g > -40);
}

/**
 * Overton-Effekt: kleine BT-Stimmen-Modifikation (nur Atmosphäre).
 * Konservativ/Sicherheit: +2 %, Progressiv: −2 %.
 */
export function getNfBundestagBtModifikator(law: Law): number {
  const prog = isProgressivNfGegner(law);
  const kons = isKonservativNfMitlauf(law);
  if (prog && kons) return 0;
  if (prog) return -2;
  if (kons) return 2;
  return 0;
}

export function getNfBundestagMedienDelta(law: Law): number {
  if (!law.ideologie) return 0;
  const k = berechneKongruenz(NF_IDEOLOGIE_REF, law.ideologie);
  return k >= NF_KONGRUENZ_MEDIEN_SCHWELLE ? -3 : 0;
}
