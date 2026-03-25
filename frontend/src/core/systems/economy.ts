import type { GameState, KPI, Approval } from '../types';
import {
  clamp,
  APPROVAL_BASE, APPROVAL_AL_FAKTOR, APPROVAL_HH_FAKTOR, APPROVAL_GI_FAKTOR, APPROVAL_ZF_FAKTOR,
  APPROVAL_MIN, APPROVAL_MAX, SEGMENT_APPROVAL_MIN,
  KPI_DRIFT_CHANCE, MAX_LOG_ENTRIES,
} from '../constants';

/**
 * Berechnet Zustimmungswerte aus KPI-Werten.
 * Formel: w = BASE + (10 - AL) × AL_F + HH × HH_F + (50 - GI) × GI_F + (ZF - 50) × ZF_F
 */
export function recalcApproval(kpi: KPI, currentApproval: Approval): Approval {
  const w = APPROVAL_BASE
    + (10 - kpi.al) * APPROVAL_AL_FAKTOR
    + kpi.hh * APPROVAL_HH_FAKTOR
    + (50 - kpi.gi) * APPROVAL_GI_FAKTOR
    + (kpi.zf - 50) * APPROVAL_ZF_FAKTOR;
  const g = clamp(Math.round(w), APPROVAL_MIN, APPROVAL_MAX);
  const arbeit = clamp(Math.round(g + (10 - kpi.al) * 1.5 - (kpi.gi - 30) * 0.4), SEGMENT_APPROVAL_MIN, APPROVAL_MAX);
  const mitte = clamp(Math.round(g + kpi.hh * 3), SEGMENT_APPROVAL_MIN, APPROVAL_MAX);
  const prog = clamp(
    Math.round(currentApproval.prog - (kpi.gi - 28) * 0.5 + (kpi.zf - 50) * 0.15),
    SEGMENT_APPROVAL_MIN, APPROVAL_MAX,
  );
  return { g, arbeit, mitte, prog };
}

export function applyPendingEffects(state: GameState): GameState {
  const remaining: typeof state.pending = [];
  const newKpi = { ...state.kpi };
  const newLog = [...state.log];

  for (const p of state.pending) {
    if (p.month <= state.month) {
      newKpi[p.key] = +Math.max(0, newKpi[p.key] + p.delta).toFixed(2);
      if (p.key === 'zf') newKpi.zf = Math.min(100, newKpi.zf);
      newLog.unshift({
        time: formatTime(state.month),
        msg: `Wirkung spürbar: ${p.label}`,
        type: 'g',
      });
    } else {
      remaining.push(p);
    }
  }

  return { ...state, kpi: newKpi, pending: remaining, log: newLog.slice(0, MAX_LOG_ENTRIES) };
}

export function applyKPIDrift(kpi: KPI): KPI {
  const newKpi = { ...kpi };
  if (Math.random() < KPI_DRIFT_CHANCE) {
    newKpi.al = +clamp(newKpi.al + (Math.random() - 0.53) * 0.2, 2, 15).toFixed(2);
  }
  return newKpi;
}

export function scheduleEffects(
  state: GameState,
  law: { effekte: Record<string, number>; lag: number; kurz: string },
): GameState {
  const newPending = [...state.pending];
  for (const [k, v] of Object.entries(law.effekte)) {
    newPending.push({
      month: state.month + law.lag,
      key: k as keyof KPI,
      delta: v,
      label: law.kurz,
    });
  }
  return { ...state, pending: newPending };
}

function formatTime(month: number): string {
  const yr = 2025 + Math.floor((month - 1) / 12);
  const mo = ((month - 1) % 12) + 1;
  return `${String(mo).padStart(2, '0')}/${yr}`;
}
