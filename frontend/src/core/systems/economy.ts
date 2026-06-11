import type { GameState, KPI, Approval, ZustOffsets } from '../types';
import {
  clamp,
  APPROVAL_BASE, APPROVAL_AL_FAKTOR, APPROVAL_HH_FAKTOR, APPROVAL_GI_FAKTOR, APPROVAL_ZF_FAKTOR,
  APPROVAL_MIN, APPROVAL_MAX, SEGMENT_APPROVAL_MIN,
  ZUST_OFFSET_DECAY, ZUST_OFFSET_MAX, ZUST_OFFSET_EPSILON,
  SEGMENT_ARBEIT_AL_FAKTOR, SEGMENT_ARBEIT_GI_FAKTOR, SEGMENT_MITTE_HH_FAKTOR,
  SEGMENT_PROG_GI_FAKTOR, SEGMENT_PROG_ZF_FAKTOR, SEGMENT_GI_BASELINE,
  KPI_DRIFT_CHANCE, MAX_LOG_ENTRIES,
  KPI_AL_BOUNDS, KPI_HH_BOUNDS, KPI_GI_BOUNDS, KPI_ZF_BOUNDS,
  KPI_AL_DRIFT_BIAS, KPI_AL_DRIFT_MAGNITUDE,
  KPI_HH_DRIFT_CHANCE, KPI_HH_DRIFT_BIAS, KPI_HH_DRIFT_MAGNITUDE,
  KPI_GI_DRIFT_CHANCE, KPI_GI_DRIFT_BIAS, KPI_GI_DRIFT_MAGNITUDE,
  KPI_ZF_DRIFT_CHANCE, KPI_ZF_DRIFT_BIAS, KPI_ZF_DRIFT_MAGNITUDE,
  KPI_ZF_VERFALL, KPI_ZF_ERHOLUNG_SCHWELLE, KPI_ZF_ERHOLUNG,
} from '../constants';
import { nextRandom } from '../rng';

/**
 * Berechnet Zustimmungswerte aus KPI-Werten.
 * Formel: w = BASE + (10 - AL) × AL_F + HH × HH_F + (50 - GI) × GI_F + (ZF - 50) × ZF_F
 *
 * Optionale zustOffsets (Medienkampagne, Start-Ausrichtung) werden additiv
 * auf die Segmente angewendet — ohne sie gingen direkte Segment-Boosts
 * beim nächsten Tick verloren, weil die Formel zustandslos ist.
 */
export function recalcApproval(kpi: KPI, _currentApproval: Approval, offsets?: ZustOffsets): Approval {
  const w = APPROVAL_BASE
    + (10 - kpi.al) * APPROVAL_AL_FAKTOR
    + kpi.hh * APPROVAL_HH_FAKTOR
    + (50 - kpi.gi) * APPROVAL_GI_FAKTOR
    + (kpi.zf - 50) * APPROVAL_ZF_FAKTOR;
  const g = clamp(Math.round(w), APPROVAL_MIN, APPROVAL_MAX);
  const arbeit = clamp(
    Math.round(g + (10 - kpi.al) * SEGMENT_ARBEIT_AL_FAKTOR - (kpi.gi - SEGMENT_GI_BASELINE) * SEGMENT_ARBEIT_GI_FAKTOR + (offsets?.arbeit ?? 0)),
    SEGMENT_APPROVAL_MIN, APPROVAL_MAX,
  );
  const mitte = clamp(
    Math.round(g + kpi.hh * SEGMENT_MITTE_HH_FAKTOR + (offsets?.mitte ?? 0)),
    SEGMENT_APPROVAL_MIN, APPROVAL_MAX,
  );
  const prog = clamp(
    Math.round(g - (kpi.gi - SEGMENT_GI_BASELINE) * SEGMENT_PROG_GI_FAKTOR + (kpi.zf - 50) * SEGMENT_PROG_ZF_FAKTOR + (offsets?.prog ?? 0)),
    SEGMENT_APPROVAL_MIN, APPROVAL_MAX,
  );
  return { g, arbeit, mitte, prog };
}

/**
 * Lässt Segment-Offsets monatlich abklingen (×ZUST_OFFSET_DECAY).
 * Werte unter ZUST_OFFSET_EPSILON werden 0; sind alle 0, wird undefined
 * zurückgegeben, damit alte Saves/States kompakt bleiben.
 */
export function decayZustOffsets(offsets: ZustOffsets | undefined): ZustOffsets | undefined {
  if (!offsets) return undefined;
  const decay = (v: number) => {
    const d = v * ZUST_OFFSET_DECAY;
    return Math.abs(d) < ZUST_OFFSET_EPSILON ? 0 : +d.toFixed(2);
  };
  const next = { arbeit: decay(offsets.arbeit), mitte: decay(offsets.mitte), prog: decay(offsets.prog) };
  if (next.arbeit === 0 && next.mitte === 0 && next.prog === 0) return undefined;
  return next;
}

/** Addiert ein Delta auf einen Segment-Offset (geclampt auf ±ZUST_OFFSET_MAX) */
export function addZustOffset(
  offsets: ZustOffsets | undefined,
  segment: keyof ZustOffsets,
  delta: number,
): ZustOffsets {
  const base: ZustOffsets = offsets ?? { arbeit: 0, mitte: 0, prog: 0 };
  return {
    ...base,
    [segment]: clamp(+(base[segment] + delta).toFixed(2), -ZUST_OFFSET_MAX, ZUST_OFFSET_MAX),
  };
}

export function applyPendingEffects(state: GameState): GameState {
  const remaining: typeof state.pending = [];
  const newKpi = { ...state.kpi };
  const newLog = [...state.log];

  for (const p of state.pending) {
    if (p.month <= state.month) {
      newKpi[p.key] = Math.max(0, newKpi[p.key] + p.delta);
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
  // AL: häufiger Drift mit leichtem Aufwärtstrend (Arbeitsmarkt verschlechtert sich ohne aktive Politik)
  if (nextRandom() < KPI_DRIFT_CHANCE) {
    newKpi.al = clamp(newKpi.al + (nextRandom() - KPI_AL_DRIFT_BIAS) * KPI_AL_DRIFT_MAGNITUDE, ...KPI_AL_BOUNDS);
  }
  // HH: seltener Drift mit leichter Verschlechterung (strukturelle Ausgabensteigerungen)
  if (nextRandom() < KPI_HH_DRIFT_CHANCE) {
    newKpi.hh = clamp(newKpi.hh + (nextRandom() - KPI_HH_DRIFT_BIAS) * KPI_HH_DRIFT_MAGNITUDE, ...KPI_HH_BOUNDS);
  }
  // GI: selten, leicht steigend (Ungleichheit wächst ohne Gegenmaßnahmen)
  if (nextRandom() < KPI_GI_DRIFT_CHANCE) {
    newKpi.gi = clamp(newKpi.gi + (nextRandom() - KPI_GI_DRIFT_BIAS) * KPI_GI_DRIFT_MAGNITUDE, ...KPI_GI_BOUNDS);
  }
  // ZF: häufigerer Drift mit Abwärtstrend (Bevölkerung wird ohne aktive Politik unzufriedener)
  if (nextRandom() < KPI_ZF_DRIFT_CHANCE) {
    newKpi.zf = clamp(newKpi.zf + (nextRandom() - KPI_ZF_DRIFT_BIAS) * KPI_ZF_DRIFT_MAGNITUDE, ...KPI_ZF_BOUNDS);
  }
  // Natürlicher ZF-Verfall mit Bodenbildung: bei sehr niedriger ZF erholt sich
  // die Stimmung leicht statt weiter zu fallen (verhindert die Abwärtsspirale).
  if (newKpi.zf < KPI_ZF_ERHOLUNG_SCHWELLE) {
    newKpi.zf = clamp(newKpi.zf + KPI_ZF_ERHOLUNG, ...KPI_ZF_BOUNDS);
  } else {
    newKpi.zf = clamp(newKpi.zf - KPI_ZF_VERFALL, ...KPI_ZF_BOUNDS);
  }
  return newKpi;
}

/** Rundet alle KPI-Werte auf 2 Dezimalstellen — einmal am Ende des Ticks aufrufen */
export function roundKpi(kpi: KPI): KPI {
  return {
    al: +kpi.al.toFixed(2),
    hh: +kpi.hh.toFixed(2),
    gi: +kpi.gi.toFixed(2),
    zf: +kpi.zf.toFixed(2),
  };
}

export function scheduleEffects(
  state: GameState,
  law: { effekte: Record<string, number>; lag: number; kurz: string; gesetzId?: string },
): GameState {
  const newPending = [...state.pending];
  for (const [k, v] of Object.entries(law.effekte)) {
    newPending.push({
      month: state.month + law.lag,
      key: k as keyof KPI,
      delta: v,
      label: law.kurz,
      ...(law.gesetzId != null && law.gesetzId !== '' ? { gesetzId: law.gesetzId } : {}),
    });
  }
  return { ...state, pending: newPending };
}

function formatTime(month: number): string {
  const yr = 2025 + Math.floor((month - 1) / 12);
  const mo = ((month - 1) % 12) + 1;
  return `${String(mo).padStart(2, '0')}/${yr}`;
}
