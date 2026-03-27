/**
 * SMA-403: Eindimensionale Ideologie-Skala für BT-Malus und Partner-Widerstand.
 * Koalitions-Ideologie = Mittelwert der Skalarwerte von Regierungs- und Juniorpartei.
 */
import type { Law } from '../types';
import type { KoalitionspartnerParteiId } from '../types/politics';
import type { SpielerParteiId } from '../../data/defaults/parteien';

/** Links (−100) bis rechts (+100), wie im GDD / Issue SMA-403 */
export const PARTEI_IDEOLOGIE_SKALAR: Record<SpielerParteiId | KoalitionspartnerParteiId, number> = {
  sdp: -30,
  gp: -40,
  cdp: +30,
  ldp: +20,
  lp: -60,
};

/**
 * Partner-Kernthemen als Politikfeld-IDs (Positivliste — Verletzung nur bei Überlappung mit Gesetz).
 */
export const PARTNER_KERNTHEMEN_POLITIKFELDER: Record<KoalitionspartnerParteiId, string[]> = {
  gp: ['umwelt_energie', 'digital_infrastruktur', 'landwirtschaft'],
  sdp: ['arbeit_soziales', 'gesundheit_pflege', 'bildung_forschung'],
  cdp: ['wirtschaft_finanzen', 'innere_sicherheit', 'arbeit_soziales'],
  ldp: ['wirtschaft_finanzen', 'digital_infrastruktur', 'arbeit_soziales'],
  lp: ['arbeit_soziales', 'umwelt_energie', 'gesundheit_pflege'],
};

export type PartnerWiderstandIntensitaet = 'hinweis' | 'widerstand' | 'veto';

export interface PartnerWiderstandErgebnis {
  gesetzId: string;
  partnerId: KoalitionspartnerParteiId;
  intensitaet: PartnerWiderstandIntensitaet;
  /** Koalitions-Beziehung bei „trotzdem einbringen“ (hinweis/widerstand) */
  koalitionsMalus: number;
}

/** Malus in Prozentpunkten auf BT-Ja (negativ). */
export function berechneIdeologieMalus(abstand: number): number {
  if (abstand < 20) return 0;
  if (abstand < 40) return -5;
  if (abstand < 60) return -15;
  if (abstand < 80) return -25;
  return -40;
}

export function getGesetzIdeologieWert(law: Law): number {
  if (law.ideologie_wert != null) return Math.max(-100, Math.min(100, law.ideologie_wert));
  const i = law.ideologie;
  if (i) {
    const m = Math.round((i.wirtschaft + i.gesellschaft + i.staat) / 3);
    return Math.max(-100, Math.min(100, m));
  }
  return 0;
}

export function getKoalitionIdeologieSkalar(
  spielerParteiId: SpielerParteiId | undefined,
  partnerId: KoalitionspartnerParteiId | undefined,
): number {
  const sp = spielerParteiId ? PARTEI_IDEOLOGIE_SKALAR[spielerParteiId] : 0;
  if (!partnerId) return sp;
  const pp = PARTEI_IDEOLOGIE_SKALAR[partnerId];
  return Math.round((sp + pp) / 2);
}

function gesetzBeruehrtPartnerKernthemen(law: Law, partnerId: KoalitionspartnerParteiId): boolean {
  const heilig = PARTNER_KERNTHEMEN_POLITIKFELDER[partnerId];
  const felder = [law.politikfeldId, ...(law.politikfeldSekundaer ?? [])].filter(
    (x): x is string => !!x && x.length > 0,
  );
  return felder.some((f) => heilig.includes(f));
}

/**
 * Partner-Widerstand vor Einbringen (Stufe 3+). Veto nur ab Stufe 4 (sonst auf „widerstand“ begrenzt).
 */
export function pruefePartnerWiderstand(
  law: Law,
  partnerId: KoalitionspartnerParteiId | undefined,
  complexity: number,
  options?: { vetoErlaubt?: boolean },
): PartnerWiderstandErgebnis | null {
  if (!partnerId || !gesetzBeruehrtPartnerKernthemen(law, partnerId)) return null;

  const partnerSkalar = PARTEI_IDEOLOGIE_SKALAR[partnerId];
  const gesetzSkalar = getGesetzIdeologieWert(law);
  const abstand = Math.abs(partnerSkalar - gesetzSkalar);

  let intensitaet: PartnerWiderstandIntensitaet;
  let koalitionsMalus = 0;
  if (abstand > 70) {
    intensitaet = 'veto';
  } else if (abstand > 50) {
    intensitaet = 'widerstand';
    koalitionsMalus = -15;
  } else {
    intensitaet = 'hinweis';
    koalitionsMalus = -5;
  }

  const vetoErlaubt = options?.vetoErlaubt ?? complexity >= 4;
  if (intensitaet === 'veto' && !vetoErlaubt) {
    intensitaet = 'widerstand';
    koalitionsMalus = -15;
  }

  return {
    gesetzId: law.id,
    partnerId,
    intensitaet,
    koalitionsMalus,
  };
}

export function getIdeologieMalusFuerBt(
  law: Law,
  spielerParteiId: SpielerParteiId | undefined,
  partnerId: KoalitionspartnerParteiId | undefined,
): number {
  const koal = getKoalitionIdeologieSkalar(spielerParteiId, partnerId);
  const gz = getGesetzIdeologieWert(law);
  return berechneIdeologieMalus(Math.abs(koal - gz));
}
