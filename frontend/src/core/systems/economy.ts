import type { GameState, KPI, Approval } from '../types';

export function recalcApproval(kpi: KPI, _currentApproval: Approval): Approval {
  const w = 30 + (10 - kpi.al) * 1.3 + kpi.hh * 2.5 + (50 - kpi.gi) * 0.25 + (kpi.zf - 50) * 0.4;
  const g = Math.min(95, Math.max(15, Math.round(w)));
  const arbeit = Math.min(95, Math.max(10, Math.round(g + (10 - kpi.al) * 1.5 - (kpi.gi - 30) * 0.4)));
  const mitte = Math.min(95, Math.max(10, Math.round(g + kpi.hh * 3)));
  const prog = Math.min(95, Math.max(10, Math.round(g - (kpi.gi - 28) * 0.5 + (kpi.zf - 50) * 0.15)));
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

  return { ...state, kpi: newKpi, pending: remaining, log: newLog.slice(0, 60) };
}

export function applyKPIDrift(kpi: KPI): KPI {
  const newKpi = { ...kpi };
  // AL: häufiger, kleiner Drift (Arbeitsmarkt reagiert auf externe Faktoren)
  if (Math.random() < 0.25) {
    newKpi.al = +Math.max(2, Math.min(15, newKpi.al + (Math.random() - 0.53) * 0.2)).toFixed(2);
  }
  // HH: seltener, sehr kleiner Drift (Haushalt ist träge)
  if (Math.random() < 0.12) {
    newKpi.hh = +Math.max(-10, Math.min(10, newKpi.hh + (Math.random() - 0.5) * 0.15)).toFixed(2);
  }
  // GI: selten, minimal (Ungleichheit ändert sich langsam)
  if (Math.random() < 0.10) {
    newKpi.gi = +Math.max(10, Math.min(60, newKpi.gi + (Math.random() - 0.48) * 0.12)).toFixed(2);
  }
  // ZF: moderat (Zufriedenheit schwankt durch externe Faktoren)
  if (Math.random() < 0.18) {
    newKpi.zf = +Math.max(20, Math.min(80, newKpi.zf + (Math.random() - 0.5) * 0.18)).toFixed(2);
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
