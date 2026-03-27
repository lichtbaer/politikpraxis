/**
 * Gestapeltes Balkendiagramm: Ausstehende Gesetz-Auswirkungen nach Monat.
 * Zeigt welche KPIs (AL, HH, GI, ZF) in den nächsten Monaten beeinflusst werden.
 */
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import type { PendingEffect } from '../../../core/types';
import styles from './PendingEffekteChart.module.css';

interface PendingEffekteChartProps {
  pending: PendingEffect[];
  currentMonth: number;
}

const KPI_COLORS: Record<string, string> = {
  al: '#c05848',
  hh: '#5a9870',
  gi: '#c8a84b',
  zf: '#5888c0',
};

const KPI_LOWER_BETTER = new Set(['al', 'gi']);

const KPI_KEYS = ['al', 'hh', 'gi', 'zf'] as const;

export function PendingEffekteChart({ pending, currentMonth }: PendingEffekteChartProps) {
  const { t } = useTranslation('game');

  const kpiLabel = useCallback((key: string) => t(`pendingEffekte.${key}.label`), [t]);
  const kpiDesc = useCallback((key: string) => t(`pendingEffekte.${key}.desc`), [t]);

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
        `<strong>${t('pendingEffekte.tooltipMonth', { month, offset })}</strong>`,
      ];
      for (const key of KPI_KEYS) {
        const entries = kpiEntries[key][month];
        if (!entries || entries.length === 0) continue;
        const color = KPI_COLORS[key];
        const lowerBetter = KPI_LOWER_BETTER.has(key);
        const sum = kpiSums[key][month] ?? 0;
        const sign = sum > 0 ? '+' : '';
        const isGoodChange = lowerBetter ? sum < 0 : sum > 0;
        const valueColor = isGoodChange ? '#5a9870' : '#c05848';
        lines.push(
          `<div style="margin-top:4px">` +
          `<span style="color:${color};font-weight:600">${kpiLabel(key)}</span>` +
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
  }, [pending, currentMonth, t, kpiLabel]);

  const option: EChartsOption = useMemo(() => {
    if (months.length === 0) return {};

    const xLabels = months.map((m) => {
      const offset = m - currentMonth;
      return offset === 0 ? t('pendingEffekte.now') : `+${offset} Mo.`;
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
        ).map((k) => ({ name: kpiLabel(k), itemStyle: { color: KPI_COLORS[k] } })),
        bottom: 0,
        textStyle: { color: 'rgba(255,255,255,0.5)', fontSize: 9 },
        itemWidth: 10,
        itemHeight: 10,
      },
      series: KPI_KEYS.filter((k) =>
        months.some((m) => (seriesData[k]?.[m] ?? 0) !== 0),
      ).map((k) => ({
        name: kpiLabel(k),
        type: 'bar',
        stack: 'effects',
        data: months.map((m) => seriesData[k]?.[m] ?? 0),
        itemStyle: { color: KPI_COLORS[k], opacity: 0.85 },
        emphasis: { itemStyle: { opacity: 1 } },
      })),
    };
  }, [months, seriesData, tooltipByMonth, currentMonth, t, kpiLabel]);

  if (pending.length === 0) {
    return (
      <div className={styles.empty}>
        {t('pendingEffekte.noData')}
      </div>
    );
  }

  const totalEffects = pending.length;
  const nearestMonth = months[0];
  const offsetToNearest = nearestMonth ? nearestMonth - currentMonth : null;

  const offsetLabel = offsetToNearest === 0
    ? t('pendingEffekte.thisMonth')
    : offsetToNearest === 1
      ? t('pendingEffekte.monthSingular', { count: offsetToNearest ?? 0 })
      : t('pendingEffekte.monthPlural', { count: offsetToNearest ?? 0 });

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.headerLabel}>{t('pendingEffekte.title')}</span>
        <span className={styles.headerCount}>{t('pendingEffekte.effekte', { count: totalEffects })}</span>
      </div>
      {offsetToNearest !== null && (
        <p className={styles.nextHint}>
          {t('pendingEffekte.nextHint', { offset: offsetLabel })}
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
          const hasEffect = months.some((m) => (seriesData[k]?.[m] ?? 0) !== 0);
          if (!hasEffect) return null;
          return (
            <div key={k} className={styles.kpiLegendItem} title={kpiDesc(k)}>
              <span className={styles.kpiDot} style={{ backgroundColor: KPI_COLORS[k] }} />
              <span className={styles.kpiKey}>{k.toUpperCase()}</span>
              <span className={styles.kpiDesc}>{kpiDesc(k)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
