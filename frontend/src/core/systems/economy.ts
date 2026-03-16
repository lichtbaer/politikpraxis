import type { GameState, KPI, Approval } from '../types';

export function recalcApproval(kpi: KPI, currentApproval: Approval): Approval {
  const w = 30 + (10 - kpi.al) * 1.3 + kpi.hh * 2.5 + (50 - kpi.gi) * 0.25 + (kpi.zf - 50) * 0.4;
  const g = Math.min(95, Math.max(15, Math.round(w)));
  const arbeit = Math.min(95, Math.max(10, Math.round(g + (10 - kpi.al) * 1.5 - (kpi.gi - 30) * 0.4)));
  const mitte = Math.min(95, Math.max(10, Math.round(g + kpi.hh * 3)));
  const prog = Math.min(
    95,
    Math.max(10, Math.round(currentApproval.prog - (kpi.gi - 28) * 0.5 + (kpi.zf - 50) * 0.15)),
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

  return { ...state, kpi: newKpi, pending: remaining, log: newLog.slice(0, 60) };
}

export function applyKPIDrift(kpi: KPI): KPI {
  const newKpi = { ...kpi };
  if (Math.random() < 0.25) {
    newKpi.al = +Math.max(2, Math.min(15, newKpi.al + (Math.random() - 0.53) * 0.2)).toFixed(2);
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
