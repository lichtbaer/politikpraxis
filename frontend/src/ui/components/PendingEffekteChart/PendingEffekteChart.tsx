/**
 * Gestapeltes Balkendiagramm: Ausstehende Gesetz-Auswirkungen nach Monat.
 * Zeigt welche KPIs (AL, HH, GI, ZF) in den nächsten Monaten beeinflusst werden.
 */
import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import type { PendingEffect } from '../../../core/types';
import styles from './PendingEffekteChart.module.css';

interface PendingEffekteChartProps {
  pending: PendingEffect[];
  currentMonth: number;
}

const KPI_META: Record<string, { label: string; color: string; desc: string; lowerBetter: boolean }> = {
  al: { label: 'Arbeitslosigkeit', color: '#c05848', desc: 'Erwerbslosenquote — niedrig ist besser', lowerBetter: true },
  hh: { label: 'Haushalt', color: '#5a9870', desc: 'Haushaltssaldo in Mrd. € — positiv ist besser', lowerBetter: false },
  gi: { label: 'Gini', color: '#c8a84b', desc: 'Ungleichheitskoeffizient — niedrig ist besser', lowerBetter: true },
  zf: { label: 'Zufriedenheit', color: '#5888c0', desc: 'Bevölkerungszufriedenheit — hoch ist besser', lowerBetter: false },
};

const KPI_KEYS = ['al', 'hh', 'gi', 'zf'] as const;

export function PendingEffekteChart({ pending, currentMonth }: PendingEffekteChartProps) {
  // Group by relative month offset
  const { months, seriesData, tooltipByMonth } = useMemo(() => {
    if (pending.length === 0) return { months: [], seriesData: {}, tooltipByMonth: {} };

    const byMonth: Record<number, PendingEffect[]> = {};
    for (const eff of pending) {
      if (eff.month >= currentMonth) {
        (byMonth[eff.month] ??= []).push(eff);
      }
    }

    const sortedMonths = Object.keys(byMonth).map(Number).sort((a, b) => a - b);

    // Per KPI, per month: sum of deltas
    const kpiSums: Record<string, Record<number, number>> = {};
    const kpiEntries: Record<string, Record<number, PendingEffect[]>> = {};
    for (const key of KPI_KEYS) {
      kpiSums[key] = {};
      kpiEntries[key] = {};
    }
    for (const month of sortedMonths) {
      for (const eff of byMonth[month]) {
        const key = eff.key;
        if (!KPI_KEYS.includes(key as (typeof KPI_KEYS)[number])) continue;
        kpiSums[key][month] = (kpiSums[key][month] ?? 0) + eff.delta;
        (kpiEntries[key][month] ??= []).push(eff);
      }
    }

    // Tooltip: month → html
    const tooltipByMonth: Record<number, string> = {};
    for (const month of sortedMonths) {
      const offset = month - currentMonth;
      const lines: string[] = [
        `<strong>Monat ${month} (+${offset} Mo.)</strong>`,
      ];
      for (const key of KPI_KEYS) {
        const entries = kpiEntries[key][month];
        if (!entries || entries.length === 0) continue;
        const meta = KPI_META[key];
        const sum = kpiSums[key][month] ?? 0;
        const sign = sum > 0 ? '+' : '';
        const isGoodChange = meta.lowerBetter ? sum < 0 : sum > 0;
        const valueColor = isGoodChange ? '#5a9870' : '#c05848';
        lines.push(
          `<div style="margin-top:4px">` +
          `<span style="color:${meta.color};font-weight:600">${meta.label}</span>` +
          `<span style="float:right;color:${valueColor};font-weight:700;margin-left:8px">${sign}${sum.toFixed(1)}</span>` +
          `</div>`,
        );
        for (const e of entries) {
          lines.push(
            `<div style="padding-left:8px;color:#888;font-size:10px">→ ${e.label}: ${e.delta > 0 ? '+' : ''}${e.delta}</div>`,
          );
        }
      }
      tooltipByMonth[month] = lines.join('');
    }

    return { months: sortedMonths, seriesData: kpiSums, tooltipByMonth };
  }, [pending, currentMonth]);

  const option: EChartsOption = useMemo(() => {
    if (months.length === 0) return {};

    const xLabels = months.map((m) => {
      const offset = m - currentMonth;
      return offset === 0 ? 'Jetzt' : `+${offset} Mo.`;
    });

    return {
      animation: true,
      animationDuration: 500,
      grid: { top: 8, right: 8, bottom: 20, left: 40, containLabel: false },
      xAxis: {
        type: 'category',
        data: xLabels,
        axisLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 9 },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 8 },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.07)', type: 'dashed', width: 0.5 } },
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: '#1e1c18',
        borderColor: '#444',
        borderWidth: 1,
        padding: [8, 12],
        textStyle: { color: '#d0cfc8', fontSize: 11 },
        formatter: (params: unknown) => {
          const p = params as Array<{ dataIndex: number }>;
          if (!p[0]) return '';
          const month = months[p[0].dataIndex];
          return tooltipByMonth[month] ?? '';
        },
      },
      legend: {
        data: KPI_KEYS.filter((k) =>
          months.some((m) => (seriesData[k]?.[m] ?? 0) !== 0),
        ).map((k) => ({ name: KPI_META[k].label, itemStyle: { color: KPI_META[k].color } })),
        bottom: 0,
        textStyle: { color: 'rgba(255,255,255,0.5)', fontSize: 9 },
        itemWidth: 10,
        itemHeight: 10,
      },
      series: KPI_KEYS.filter((k) =>
        months.some((m) => (seriesData[k]?.[m] ?? 0) !== 0),
      ).map((k) => ({
        name: KPI_META[k].label,
        type: 'bar',
        stack: 'effects',
        data: months.map((m) => seriesData[k]?.[m] ?? 0),
        itemStyle: { color: KPI_META[k].color, opacity: 0.85 },
        emphasis: { itemStyle: { opacity: 1 } },
      })),
    };
  }, [months, seriesData, tooltipByMonth, currentMonth]);

  if (pending.length === 0) {
    return (
      <div className={styles.empty}>
        Keine ausstehenden Gesetz-Auswirkungen.
      </div>
    );
  }

  const totalEffects = pending.length;
  const nearestMonth = months[0];
  const offsetToNearest = nearestMonth ? nearestMonth - currentMonth : null;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.headerLabel}>Geplante Auswirkungen — Übersicht</span>
        <span className={styles.headerCount}>{totalEffects} Effekte</span>
      </div>
      {offsetToNearest !== null && (
        <p className={styles.nextHint}>
          Nächste Wirkung in {offsetToNearest === 0 ? 'diesem Monat' : `${offsetToNearest} Monat${offsetToNearest === 1 ? '' : 'en'}`}.
          Hover für Details.
        </p>
      )}
      <ReactECharts
        option={option}
        theme="politikpraxis"
        style={{ width: '100%', height: 140 }}
        opts={{ renderer: 'canvas' }}
        notMerge={false}
      />
      <div className={styles.kpiLegend}>
        {KPI_KEYS.map((k) => {
          const meta = KPI_META[k];
          const hasEffect = months.some((m) => (seriesData[k]?.[m] ?? 0) !== 0);
          if (!hasEffect) return null;
          return (
            <div key={k} className={styles.kpiLegendItem} title={meta.desc}>
              <span className={styles.kpiDot} style={{ backgroundColor: meta.color }} />
              <span className={styles.kpiKey}>{k.toUpperCase()}</span>
              <span className={styles.kpiDesc}>{meta.desc}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
