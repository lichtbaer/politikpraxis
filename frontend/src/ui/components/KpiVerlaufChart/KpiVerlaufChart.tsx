/**
 * KPI-Zeitreihen: Vier Mini-Liniendiagramme (AL, HH, GI, ZF) über die letzten 12 Monate.
 * Jedes Diagramm hat seine native Skala und erklärt den KPI per Tooltip.
 */
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import ReactEChartsCore from 'echarts-for-react/esm/core';
import type { EChartsOption } from 'echarts';
import type { TFunction } from 'i18next';
import { echarts } from '../../lib/echarts';
import { useChartTheme } from '../../hooks/useChartTheme';
import type { ChartTokens } from '../../lib/chartTokens';
import styles from './KpiVerlaufChart.module.css';

interface KpiHistory {
  al: number[];
  hh: number[];
  gi: number[];
  zf: number[];
}

interface KpiVerlaufChartProps {
  history: KpiHistory;
  current: { al: number; hh: number; gi: number; zf: number };
}

interface KpiConfig {
  key: keyof KpiHistory;
  unit: string;
  /** Lower is better? */
  lowerBetter: boolean;
  /** Token-Namen statt Hex — die Farbe kommt aus dem aktiven Theme. */
  color: keyof ChartTokens;
  warnColor: keyof ChartTokens;
  /** Value considered "good" threshold */
  goodThreshold: number;
  /** Direction: above or below good threshold is good */
  goodDir: 'below' | 'above';
  min: number;
  max: number;
  /** markLine threshold for "target" */
  targetLine?: number;
}

const KPI_CONFIGS: KpiConfig[] = [
  {
    key: 'al',
    unit: '%',
    lowerBetter: true,
    color: 'red',
    warnColor: 'warn',
    goodThreshold: 5,
    goodDir: 'below',
    min: 0,
    max: 15,
    targetLine: 5,
  },
  {
    key: 'hh',
    unit: ' Mrd. €',
    lowerBetter: false,
    color: 'green',
    warnColor: 'red',
    goodThreshold: 0,
    goodDir: 'above',
    min: -60,
    max: 20,
    targetLine: 0,
  },
  {
    key: 'gi',
    unit: '',
    lowerBetter: true,
    color: 'gold',
    warnColor: 'red',
    goodThreshold: 30,
    goodDir: 'below',
    min: 20,
    max: 50,
  },
  {
    key: 'zf',
    unit: '%',
    lowerBetter: false,
    color: 'blue',
    warnColor: 'red',
    goodThreshold: 50,
    goodDir: 'above',
    min: 0,
    max: 100,
    targetLine: 50,
  },
];

function isGood(cfg: KpiConfig, value: number): boolean {
  return cfg.goodDir === 'below' ? value <= cfg.goodThreshold : value >= cfg.goodThreshold;
}

function buildSparkOption(
  cfg: KpiConfig,
  data: number[],
  t: TFunction,
  tokens: ChartTokens,
): EChartsOption {
  const currentVal = data.length > 0 ? data[data.length - 1] : null;
  const good = currentVal !== null && isGood(cfg, currentVal);
  const lineColor = good ? tokens[cfg.color] : tokens[cfg.warnColor];

  const label = t(`kpiVerlauf.${cfg.key}.label`);
  const desc = t(`kpiVerlauf.${cfg.key}.desc`);
  const impact = t(`kpiVerlauf.${cfg.key}.impact`);
  const targetLabel = t(`kpiVerlauf.${cfg.key}.target`, '');

  const markLineData = cfg.targetLine !== undefined
    ? [{
        yAxis: cfg.targetLine,
        lineStyle: { color: tokens.border2, type: 'dashed' as const, width: 1 },
        label: {
          show: true,
          position: 'insideEndTop' as const,
          formatter: targetLabel,
          color: tokens.text3,
          fontSize: 7,
        },
      }]
    : [];

  return {
    animation: false,
    grid: { top: 4, right: 4, bottom: 16, left: 36, containLabel: false },
    xAxis: {
      type: 'category',
      data: data.map((_, i) => i + 1),
      boundaryGap: false,
      axisLabel: {
        color: tokens.text3,
        fontSize: 7,
        fontFamily: tokens.sans,
        interval: (_: number, v: string) => {
          const n = Number(v);
          return n === 1 || n % 6 === 0;
        },
        formatter: (v: string) => `${v}`,
      },
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { show: false },
    },
    yAxis: {
      type: 'value',
      min: cfg.min,
      max: cfg.max,
      axisLabel: {
        color: tokens.text3,
        fontSize: 7,
        fontFamily: tokens.sans,
        formatter: (v: number) => `${v}${cfg.unit === '%' ? '%' : ''}`,
      },
      splitLine: { lineStyle: { color: tokens.border, type: 'dashed', width: 0.5 } },
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: tokens.bg2,
      borderColor: tokens.border2,
      borderWidth: 1,
      padding: [6, 10],
      textStyle: { color: tokens.text, fontSize: 10, fontFamily: tokens.sans },
      formatter: (params: unknown) => {
        const p = params as Array<{ dataIndex: number; value: number | null }>;
        const first = p.find((x) => x.value != null);
        if (!first) return '';
        const val = first.value as number;
        const g = isGood(cfg, val);
        const valColor = g ? tokens[cfg.color] : tokens[cfg.warnColor];
        return (
          `<strong>${label}</strong> — ${t('kpiVerlauf.tooltipMonat', { month: first.dataIndex + 1 })}<br/>` +
          `${t('kpiVerlauf.tooltipWert')}: <strong style="color:${valColor}">${val.toFixed(1)}${cfg.unit}</strong><br/>` +
          `<span style="color:#888;font-size:10px">${desc}</span><br/>` +
          `<span style="color:#777;font-size:10px;font-style:italic">${impact}</span>`
        );
      },
    },
    series: [
      {
        type: 'line',
        data,
        smooth: 0.3,
        symbol: 'none',
        lineStyle: { color: lineColor, width: 2 },
        areaStyle: {
          color: {
            type: 'linear' as const,
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: `${lineColor}44` },
              { offset: 1, color: `${lineColor}06` },
            ],
          },
        },
        ...(markLineData.length > 0 ? { markLine: { silent: true, symbol: 'none', data: markLineData } } : {}),
      },
    ],
  };
}

interface KpiSparkProps {
  cfg: KpiConfig;
  data: number[];
}

function KpiSpark({ cfg, data }: KpiSparkProps) {
  const { t } = useTranslation('game');
  const { theme: chartTheme, tokens } = useChartTheme();
  const option = useMemo(
    () => buildSparkOption(cfg, data, t, tokens),
    [cfg, data, t, tokens],
  );
  const currentVal = data.length > 0 ? data[data.length - 1] : null;
  const good = currentVal !== null && isGood(cfg, currentVal);
  const label = t(`kpiVerlauf.${cfg.key}.label`);

  // Trend
  let trendSymbol = '→';
  let trendGood = true;
  let trendWord = t('a11y.trendFlat');
  if (data.length >= 2) {
    const lookback = Math.min(3, data.length - 1);
    const prev = data[data.length - 1 - lookback];
    const diff = (currentVal ?? 0) - prev;
    if (Math.abs(diff) > 0.3) {
      trendSymbol = diff > 0 ? '↑' : '↓';
      trendGood = cfg.lowerBetter ? diff < 0 : diff > 0;
      trendWord = diff > 0 ? t('a11y.trendUp') : t('a11y.trendDown');
    }
  }

  const chartAriaLabel = t('kpiVerlauf.ariaLabel', {
    label,
    count: data.length,
    value: currentVal !== null ? currentVal.toFixed(1) : '—',
    unit: cfg.unit,
    trend: trendWord,
  });

  return (
    <div className={styles.sparkCard}>
      <div className={styles.sparkHeader}>
        <span className={styles.sparkLabel}>{label}</span>
        {currentVal !== null && (
          <div className={styles.sparkValueRow}>
            <span
              className={styles.sparkValue}
              style={{ color: `var(--${good ? cfg.color : cfg.warnColor})` }}
            >
              {currentVal.toFixed(1)}{cfg.unit}
            </span>
            <span
              className={styles.sparkTrend}
              style={{ color: `var(--${trendGood ? cfg.color : cfg.warnColor})` }}
              title={cfg.lowerBetter ? t('kpiVerlauf.lowerBetter') : t('kpiVerlauf.higherBetter')}
            >
              {trendSymbol}
            </span>
          </div>
        )}
      </div>
      {data.length > 1 ? (
        <div role="img" aria-label={chartAriaLabel} style={{ width: '100%' }}>
          <ReactEChartsCore
            echarts={echarts}
            option={option}
            theme={chartTheme}
            style={{ width: '100%', height: 90 }}
            opts={{ renderer: 'canvas' }}
            notMerge={false}
          />
        </div>
      ) : (
        <div className={styles.noData}>{t('kpiVerlauf.noData')}</div>
      )}
    </div>
  );
}

export function KpiVerlaufChart({ history, current }: KpiVerlaufChartProps) {
  const { t } = useTranslation('game');
  const hasAnyData = KPI_CONFIGS.some((cfg) => (history[cfg.key] ?? []).length > 0);

  if (!hasAnyData) {
    return (
      <div className={styles.empty}>
        {t('kpiVerlauf.noDataGlobal')}
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.titleRow}>
        <span className={styles.title}>{t('kpiVerlauf.title')}</span>
        <span className={styles.subtitle}>{t('kpiVerlauf.subtitle', { count: Math.max(...KPI_CONFIGS.map((c) => (history[c.key] ?? []).length)) })}</span>
      </div>
      <div className={styles.grid}>
        {KPI_CONFIGS.map((cfg) => {
          const data = history[cfg.key] ?? [];
          const enriched =
            data.length > 0 && data[data.length - 1] === current[cfg.key]
              ? data
              : [...data, current[cfg.key]];
          return <KpiSpark key={cfg.key} cfg={cfg} data={enriched} />;
        })}
      </div>
    </div>
  );
}
