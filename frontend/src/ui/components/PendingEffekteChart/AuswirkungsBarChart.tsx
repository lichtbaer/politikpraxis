import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import type { KPI } from '../../../core/types';
import {
  type AuswirkungsChartDaten,
  tintBarSegmentColor,
} from '../../lib/pendingAuswirkungsChartDaten';
import styles from './AuswirkungsBarChart.module.css';

export interface AuswirkungsBarChartProps {
  effektTyp: keyof KPI;
  effektLabel: string;
  einheit: string;
  /** AL/GI: Semantik niedrig=besser — Färbung über tintBarSegmentColor */
  invertiert?: boolean;
  daten: AuswirkungsChartDaten;
  currentMonth: number;
  xLabels: string[];
}

function formatValue(v: number, einheit: string): string {
  const sign = v > 0 ? '+' : '';
  const u = einheit.trim();
  const num = Number.isInteger(v) ? `${v}` : v.toFixed(1);
  return u ? `${sign}${num}${u}` : `${sign}${num}`;
}

function yDomainForKpi(
  daten: AuswirkungsChartDaten,
  k: keyof KPI,
): { min: number; max: number } {
  const n = daten.monate.length;
  let minY = 0;
  let maxY = 0;
  for (let i = 0; i < n; i++) {
    let pos = 0;
    let neg = 0;
    for (const g of daten.gesetze) {
      const v = g.effekte[k][i];
      if (v > 0) pos += v;
      else if (v < 0) neg += v;
    }
    maxY = Math.max(maxY, pos);
    minY = Math.min(minY, neg);
    const t = daten.gesamteffekt[k][i];
    maxY = Math.max(maxY, t);
    minY = Math.min(minY, t);
  }
  const pad = Math.max(0.15 * (maxY - minY), 0.25);
  return { min: minY - pad, max: maxY + pad };
}

export function AuswirkungsBarChart({
  effektTyp,
  effektLabel,
  einheit,
  invertiert: _invertiert,
  daten,
  currentMonth,
  xLabels,
}: AuswirkungsBarChartProps) {
  void _invertiert;
  const { t } = useTranslation('game');

  const option: EChartsOption = useMemo(() => {
    const k = effektTyp;
    const { min: yMin, max: yMax } = yDomainForKpi(daten, k);

    const barSeries: EChartsOption['series'] = [];
    for (const g of daten.gesetze) {
      const posData = daten.monate.map((_, i) => {
        const v = g.effekte[k][i];
        return v > 0 ? v : 0;
      });
      const negData = daten.monate.map((_, i) => {
        const v = g.effekte[k][i];
        return v < 0 ? v : 0;
      });

      const hasPos = posData.some((v) => v !== 0);
      const hasNeg = negData.some((v) => v !== 0);

      if (hasPos) {
        barSeries.push({
          name: `__pos__${g.id}`,
          type: 'bar',
          stack: 'pos',
          data: posData.map((val) => ({
            value: val,
            itemStyle: {
              color: tintBarSegmentColor(g.farbe, k, val),
              borderRadius: [2, 2, 0, 0],
            },
          })),
          barMaxWidth: 14,
          z: 2,
        });
      }
      if (hasNeg) {
        barSeries.push({
          name: `__neg__${g.id}`,
          type: 'bar',
          stack: 'neg',
          data: negData.map((val) => ({
            value: val,
            itemStyle: {
              color: tintBarSegmentColor(g.farbe, k, val),
            },
          })),
          barMaxWidth: 14,
          z: 2,
        });
      }
    }

    const lineData = daten.gesamteffekt[k];

    const allSeries: EChartsOption['series'] = [
      ...(barSeries ?? []),
      {
        name: '__total__',
        type: 'line',
        data: lineData,
        smooth: false,
        symbol: 'circle',
        symbolSize: 5,
        showSymbol: true,
        itemStyle: { color: 'rgba(232,228,216,0.95)', borderColor: 'rgba(40,38,34,0.9)', borderWidth: 1 },
        lineStyle: { color: 'rgba(232,228,216,0.9)', width: 2 },
        z: 10,
        emphasis: {
          lineStyle: { width: 2.5 },
        },
        markLine:
          yMin < 0 && yMax > 0
            ? {
                silent: true,
                symbol: ['none', 'none'],
                lineStyle: { color: 'rgba(255,255,255,0.22)', width: 1 },
                data: [{ yAxis: 0 }],
              }
            : undefined,
      },
    ];

    return {
      animation: true,
      animationDuration: 400,
      grid: { top: 22, right: 4, bottom: 22, left: 4, containLabel: true },
      xAxis: {
        type: 'category',
        data: xLabels,
        axisLabel: { color: 'rgba(255,255,255,0.38)', fontSize: 8 },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        min: yMin,
        max: yMax,
        axisLabel: {
          color: 'rgba(255,255,255,0.28)',
          fontSize: 7,
          formatter: (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1)),
        },
        splitLine: {
          lineStyle: { color: 'rgba(255,255,255,0.06)', type: 'dashed', width: 0.5 },
        },
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: '#1e1c18',
        borderColor: '#444',
        borderWidth: 1,
        padding: [8, 10],
        textStyle: { color: '#d0cfc8', fontSize: 10 },
        formatter: (params: unknown) => {
          const arr = params as Array<{ seriesName: string; dataIndex: number; value?: number }>;
          const first = arr.find((p) => p.dataIndex != null);
          if (!first) return '';
          const i = first.dataIndex;
          const month = daten.monate[i];
          const lines: string[] = [
            `<div style="font-weight:600;margin-bottom:4px">${t('pendingEffekte.tooltipMonth', {
              month,
              offset: month - currentMonth,
            })}</div>`,
          ];
          for (const g of daten.gesetze) {
            const v = g.effekte[k][i];
            if (v === 0) continue;
            lines.push(
              `<div style="margin-top:2px">` +
                `<span style="display:inline-block;width:8px;height:8px;background:${g.farbe};border-radius:2px;margin-right:6px;vertical-align:middle"></span>` +
                `<span style="vertical-align:middle">${g.titel_de}</span>` +
                `<span style="float:right;margin-left:10px;font-weight:700">${formatValue(v, einheit)}</span>` +
                `</div>`,
            );
          }
          const total = daten.gesamteffekt[k][i];
          lines.push(
            `<div style="margin-top:6px;padding-top:6px;border-top:1px solid rgba(255,255,255,0.12);color:rgba(232,228,216,0.95)">` +
              `${t('pendingEffekte.tooltipGesamteffekt')}: <strong>${formatValue(total, einheit)}</strong>` +
              `</div>`,
          );
          return lines.join('');
        },
      },
      series: allSeries,
    };
  }, [daten, effektTyp, einheit, t, xLabels, currentMonth]);

  return (
    <div className={styles.wrap}>
      <div className={styles.chartTitle}>{effektLabel}</div>
      <ReactECharts
        option={option}
        theme="politikpraxis"
        style={{ width: '100%', height: 168 }}
        opts={{ renderer: 'canvas' }}
        notMerge
      />
    </div>
  );
}
