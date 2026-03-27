/**
 * Medienklima-Verlauf als Liniendiagramm mit farbigen Zonen.
 * Zeigt den Verlauf der letzten Monate mit Schwellenwerten für
 * „Positiv" (≥60), „Neutral" (40–59) und „Kritisch" (<40).
 */
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { formatMedienklimaDisplay } from '../../../utils/format';
import styles from './MedienklimaTrendChart.module.css';

interface MedienklimaTrendChartProps {
  history: number[];
  current: number;
}

function getMKStatusColor(value: number): string {
  if (value >= 60) return '#5a9870';
  if (value >= 40) return '#c8a84b';
  return '#c05848';
}

function getMKStatusKey(value: number): string {
  if (value >= 60) return 'statusPositiv';
  if (value >= 40) return 'statusNeutral';
  return 'statusKritisch';
}

export function MedienklimaTrendChart({ history, current }: MedienklimaTrendChartProps) {
  const { t } = useTranslation('game');
  const historyRounded = useMemo(() => history.map((v) => Math.round(v)), [history]);
  const currentRounded = Math.round(current);
  const statusColor = getMKStatusColor(currentRounded);
  const statusLabel = t(`medienklima.${getMKStatusKey(currentRounded)}`);

  const option: EChartsOption = useMemo(() => {
    const months = historyRounded.map((_, i) => i + 1);

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
          const val = Math.round(first.value as number);
          const sColor = getMKStatusColor(val);
          const sLabel = t(`medienklima.${getMKStatusKey(val)}`);
          return (
            `<strong>${t('medienklima.tooltipMonat', { month: first.dataIndex + 1 })}</strong><br/>` +
            `${t('medienklima.tooltipLabel')}: <strong style="color:${sColor}">${val} — ${sLabel}</strong><br/>` +
            `<span style="color:#888;font-size:10px">` +
            `${t('medienklima.tooltipHint')}` +
            `</span>`
          );
        },
      },
      series: [
        {
          type: 'line',
          data: historyRounded,
          smooth: 0.3,
          symbol: 'none',
          lineStyle: { color: statusColor, width: 2 },
          areaStyle: {
            color: {
              type: 'linear' as const,
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: `${statusColor}55` },
                { offset: 1, color: `${statusColor}08` },
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
                  formatter: t('medienklima.markPositiv'),
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
                  formatter: t('medienklima.markKritisch'),
                  color: '#c0584888',
                  fontSize: 8,
                },
              },
            ],
          },
        },
      ],
    };
  }, [historyRounded, statusColor, t]);

  // Trend
  let trendSymbol = '→';
  let trendClass = styles.trendFlat;
  if (historyRounded.length >= 2) {
    const lookback = Math.min(3, historyRounded.length - 1);
    const prev = historyRounded[historyRounded.length - 1 - lookback];
    const diff = currentRounded - prev;
    if (diff > 2) { trendSymbol = '↑'; trendClass = styles.trendUp; }
    else if (diff < -2) { trendSymbol = '↓'; trendClass = styles.trendDown; }
  }

  if (historyRounded.length === 0) {
    return (
      <div className={styles.empty}>
        {t('medienklima.noData')}
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.headerLabel}>{t('medienklima.verlaufTitle')}</span>
        <div className={styles.currentRow}>
          <span className={styles.currentValue} style={{ color: statusColor }}>
            {formatMedienklimaDisplay(current)}
          </span>
          <span className={`${styles.trendIndicator} ${trendClass}`} aria-hidden="true">
            {trendSymbol}
          </span>
          <span className={styles.statusBadge} style={{ backgroundColor: `${statusColor}22`, color: statusColor }}>
            {statusLabel}
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
        {t('medienklima.caption')}
      </p>
    </div>
  );
}
