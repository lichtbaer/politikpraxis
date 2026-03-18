/**
 * SMA-330: Minister-Agenden Content — Jonas Wolf (CO2-Steuer), Lehmann (Konsolidierung)
 * Stufe 1: Keine Agenden, Stufe 2+: aktiv
 */

import type { MinisterAgendaConfig } from '../../core/types';

/** Agenda-Config pro Charakter-ID (gp_um = Jonas Wolf, cdp_fm = Lehmann) */
export const MINISTER_AGENDEN_CONFIG: Record<string, MinisterAgendaConfig> = {
  /** Jonas Wolf (GP Umwelt): CO2-Steuer ab Monat 4, Wiederholung alle 6 Monate */
  gp_um: {
    trigger_monat: 4,
    wiederholung_intervall: 6,
    max_ablehnungen: 2,
    gesetz_ref_id: 'co2_steuer',
    trigger_type: 'fixed',
  },
  /** Robert Lehmann (CDP Finanzen): Konsolidierung wenn Saldo < -15 Mrd. */
  cdp_fm: {
    trigger_monat: 1,
    wiederholung_intervall: 6,
    max_ablehnungen: 2,
    gesetz_ref_id: null,
    trigger_type: 'conditional',
    saldo_schwelle: -15,
  },
  /** Legacy-ID: um (Umweltminister) falls dynamisches Kabinett nicht genutzt */
  um: {
    trigger_monat: 4,
    wiederholung_intervall: 6,
    max_ablehnungen: 2,
    gesetz_ref_id: 'co2_steuer',
    trigger_type: 'fixed',
  },
  /** Legacy-ID: fm (Finanzminister) */
  fm: {
    trigger_monat: 1,
    wiederholung_intervall: 6,
    max_ablehnungen: 2,
    gesetz_ref_id: null,
    trigger_type: 'conditional',
    saldo_schwelle: -15,
  },
};
