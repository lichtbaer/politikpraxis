/**
 * Medienklima-Verlauf als Liniendiagramm mit farbigen Zonen.
 * Zeigt den Verlauf der letzten Monate mit Schwellenwerten für
 * „Positiv" (≥60), „Neutral" (40–59) und „Kritisch" (<40).
 */
import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import styles from './MedienklimaTrendChart.module.css';

interface MedienklimaTrendChartProps {
  history: number[];
  current: number;
}

function getMKStatus(value: number): { label: string; color: string } {
  if (value >= 60) return { label: 'Positiv', color: '#5a9870' };
  if (value >= 40) return { label: 'Neutral', color: '#c8a84b' };
  return { label: 'Kritisch', color: '#c05848' };
}

export function MedienklimaTrendChart({ history, current }: MedienklimaTrendChartProps) {
  const status = getMKStatus(current);

  const option: EChartsOption = useMemo(() => {
    const months = history.map((_, i) => i + 1);

    return {
      animation: true,
      animationDuration: 600,
      grid: { top: 28, right: 8, bottom: 20, left: 32, containLabel: false },
      xAxis: {
        type: 'category',
        data: months,
        boundaryGap: false,
        axisLabel: {
          color: 'rgba(255,255,255,0.3)',
          fontSize: 8,
          interval: (_index: number, value: string) => {
            const n = Number(value);
            return n === 1 || n % 4 === 0;
          },
          formatter: (v: string) => `Mo.${v}`,
        },
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: 100,
        interval: 20,
        axisLabel: {
          color: 'rgba(255,255,255,0.3)',
          fontSize: 8,
          formatter: '{value}',
        },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.07)', type: 'dashed', width: 0.5 } },
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#1e1c18',
        borderColor: '#444',
        borderWidth: 1,
        padding: [6, 10],
        textStyle: { color: '#d0cfc8', fontSize: 11 },
        formatter: (params: unknown) => {
          const p = params as Array<{ dataIndex: number; value: number | null }>;
          const first = p.find((x) => x.value != null);
          if (!first) return '';
          const val = first.value as number;
          const s = getMKStatus(val);
          return (
            `<strong>Monat ${first.dataIndex + 1}</strong><br/>` +
            `Medienklima: <strong style="color:${s.color}">${val} — ${s.label}</strong><br/>` +
            `<span style="color:#888;font-size:10px">` +
            `Beeinflusst Wahlchancen und Kommunikationsaktionen` +
            `</span>`
          );
        },
      },
      // Hintergrundstreifen: markArea für die drei Zonen
      series: [
        {
          type: 'line',
          data: history,
          smooth: 0.3,
          symbol: 'none',
          lineStyle: { color: status.color, width: 2 },
          areaStyle: {
            color: {
              type: 'linear' as const,
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: `${status.color}55` },
                { offset: 1, color: `${status.color}08` },
              ],
            },
          },
          markLine: {
            silent: true,
            symbol: 'none',
            data: [
              {
                yAxis: 60,
                lineStyle: { color: '#5a9870', type: 'dashed', width: 1, opacity: 0.4 },
                label: {
                  show: true,
                  position: 'insideEndTop',
                  formatter: 'Positiv 60',
                  color: '#5a987088',
                  fontSize: 8,
                },
              },
              {
                yAxis: 40,
                lineStyle: { color: '#c05848', type: 'dashed', width: 1, opacity: 0.4 },
                label: {
                  show: true,
                  position: 'insideEndBottom',
                  formatter: 'Kritisch 40',
                  color: '#c0584888',
                  fontSize: 8,
                },
              },
            ],
          },
        },
      ],
    };
  }, [history, status.color]);

  // Trend
  let trendSymbol = '→';
  let trendClass = styles.trendFlat;
  if (history.length >= 2) {
    const lookback = Math.min(3, history.length - 1);
    const prev = history[history.length - 1 - lookback];
    const diff = current - prev;
    if (diff > 2) { trendSymbol = '↑'; trendClass = styles.trendUp; }
    else if (diff < -2) { trendSymbol = '↓'; trendClass = styles.trendDown; }
  }

  if (history.length === 0) {
    return (
      <div className={styles.empty}>
        Keine Verlaufsdaten verfügbar
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.headerLabel}>Medienklima-Verlauf</span>
        <div className={styles.currentRow}>
          <span className={styles.currentValue} style={{ color: status.color }}>
            {current}
          </span>
          <span className={`${styles.trendIndicator} ${trendClass}`} aria-hidden="true">
            {trendSymbol}
          </span>
          <span className={styles.statusBadge} style={{ backgroundColor: `${status.color}22`, color: status.color }}>
            {status.label}
          </span>
        </div>
      </div>
      <ReactECharts
        option={option}
        theme="politikpraxis"
        style={{ width: '100%', height: 130 }}
        opts={{ renderer: 'canvas' }}
        notMerge={false}
      />
      <p className={styles.caption}>
        Das Medienklima beeinflusst Ihre Wahlchancen und die Wirkung von Kommunikationsaktionen.
        Werte ≥&thinsp;60 stärken die Wahlprognose, Werte &lt;&thinsp;40 gefährden sie.
      </p>
    </div>
  );
}
