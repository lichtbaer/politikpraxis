/**
 * KPI-Zeitreihen: Vier Mini-Liniendiagramme (AL, HH, GI, ZF) über die letzten 12 Monate.
 * Jedes Diagramm hat seine native Skala und erklärt den KPI per Tooltip.
 */
import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
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
  label: string;
  unit: string;
  desc: string;
  impact: string;
  /** Lower is better? */
  lowerBetter: boolean;
  color: string;
  warnColor: string;
  /** Value considered "good" threshold */
  goodThreshold: number;
  /** Direction: above or below good threshold is good */
  goodDir: 'below' | 'above';
  min: number;
  max: number;
  /** markLine threshold for "target" */
  targetLine?: number;
  targetLabel?: string;
}

const KPI_CONFIGS: KpiConfig[] = [
  {
    key: 'al',
    label: 'Arbeitslosigkeit',
    unit: '%',
    desc: 'Anteil der Erwerbslosen an der Erwerbsbevölkerung.',
    impact: 'Hohe Arbeitslosigkeit senkt die Zufriedenheit und gefährdet die Wiederwahl.',
    lowerBetter: true,
    color: '#c05848',
    warnColor: '#c8a84b',
    goodThreshold: 5,
    goodDir: 'below',
    min: 0,
    max: 15,
    targetLine: 5,
    targetLabel: 'Vollbeschäftigung 5%',
  },
  {
    key: 'hh',
    label: 'Haushaltssaldo',
    unit: ' Mrd. €',
    desc: 'Differenz aus Staatseinnahmen und -ausgaben.',
    impact: 'Ein dauerhaftes Defizit verletzt die Schuldenbremse und reduziert zukünftige Handlungsfähigkeit.',
    lowerBetter: false,
    color: '#5a9870',
    warnColor: '#c05848',
    goodThreshold: 0,
    goodDir: 'above',
    min: -60,
    max: 20,
    targetLine: 0,
    targetLabel: 'Ausgeglichen',
  },
  {
    key: 'gi',
    label: 'Gini-Koeffizient',
    unit: '',
    desc: 'Maß für wirtschaftliche Ungleichverteilung (0 = gleich, 100 = maximal ungleich).',
    impact: 'Hohe Ungleichheit verschlechtert die Gesellschafts-Dimension und schwächt progressive Milieus.',
    lowerBetter: true,
    color: '#c8a84b',
    warnColor: '#c05848',
    goodThreshold: 30,
    goodDir: 'below',
    min: 20,
    max: 50,
  },
  {
    key: 'zf',
    label: 'Zufriedenheit',
    unit: '%',
    desc: 'Allgemeine Bevölkerungszufriedenheit mit der Regierungsarbeit.',
    impact: 'Niedrige Zufriedenheit senkt die Wahlprognose direkt und reduziert die PK-Regeneration.',
    lowerBetter: false,
    color: '#5888c0',
    warnColor: '#c05848',
    goodThreshold: 50,
    goodDir: 'above',
    min: 0,
    max: 100,
    targetLine: 50,
    targetLabel: 'Ziel 50%',
  },
];

function isGood(cfg: KpiConfig, value: number): boolean {
  return cfg.goodDir === 'below' ? value <= cfg.goodThreshold : value >= cfg.goodThreshold;
}

function buildSparkOption(cfg: KpiConfig, data: number[]): EChartsOption {
  const currentVal = data.length > 0 ? data[data.length - 1] : null;
  const good = currentVal !== null && isGood(cfg, currentVal);
  const lineColor = good ? cfg.color : cfg.warnColor;

  const markLines: EChartsOption['series'] = [];
  const markLineData = cfg.targetLine !== undefined
    ? [{
        yAxis: cfg.targetLine,
        lineStyle: { color: 'rgba(255,255,255,0.2)', type: 'dashed' as const, width: 1 },
        label: {
          show: true,
          position: 'insideEndTop' as const,
          formatter: cfg.targetLabel ?? '',
          color: 'rgba(255,255,255,0.3)',
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
        color: 'rgba(255,255,255,0.25)',
        fontSize: 7,
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
        color: 'rgba(255,255,255,0.25)',
        fontSize: 7,
        formatter: (v: number) => `${v}${cfg.unit === '%' ? '%' : ''}`,
      },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)', type: 'dashed', width: 0.5 } },
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#1e1c18',
      borderColor: '#444',
      borderWidth: 1,
      padding: [6, 10],
      textStyle: { color: '#d0cfc8', fontSize: 10 },
      formatter: (params: unknown) => {
        const p = params as Array<{ dataIndex: number; value: number | null }>;
        const first = p.find((x) => x.value != null);
        if (!first) return '';
        const val = first.value as number;
        const g = isGood(cfg, val);
        const valColor = g ? cfg.color : cfg.warnColor;
        return (
          `<strong>${cfg.label}</strong> — Monat ${first.dataIndex + 1}<br/>` +
          `Wert: <strong style="color:${valColor}">${val.toFixed(1)}${cfg.unit}</strong><br/>` +
          `<span style="color:#888;font-size:10px">${cfg.desc}</span><br/>` +
          `<span style="color:#777;font-size:10px;font-style:italic">${cfg.impact}</span>`
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
        ...markLines,
      },
    ],
  };
}

interface KpiSparkProps {
  cfg: KpiConfig;
  data: number[];
}

function KpiSpark({ cfg, data }: KpiSparkProps) {
  const option = useMemo(() => buildSparkOption(cfg, data), [cfg, data]);
  const currentVal = data.length > 0 ? data[data.length - 1] : null;
  const good = currentVal !== null && isGood(cfg, currentVal);

  // Trend
  let trendSymbol = '→';
  let trendGood = true;
  if (data.length >= 2) {
    const lookback = Math.min(3, data.length - 1);
    const prev = data[data.length - 1 - lookback];
    const diff = (currentVal ?? 0) - prev;
    if (Math.abs(diff) > 0.3) {
      trendSymbol = diff > 0 ? '↑' : '↓';
      // For lower-better KPIs (al, gi), up is bad; for higher-better (hh, zf), down is bad
      trendGood = cfg.lowerBetter ? diff < 0 : diff > 0;
    }
  }

  return (
    <div className={styles.sparkCard}>
      <div className={styles.sparkHeader}>
        <span className={styles.sparkLabel}>{cfg.label}</span>
        {currentVal !== null && (
          <div className={styles.sparkValueRow}>
            <span
              className={styles.sparkValue}
              style={{ color: good ? cfg.color : cfg.warnColor }}
            >
              {currentVal.toFixed(1)}{cfg.unit}
            </span>
            <span
              className={styles.sparkTrend}
              style={{ color: trendGood ? cfg.color : cfg.warnColor }}
              title={cfg.lowerBetter ? 'Niedriger ist besser' : 'Höher ist besser'}
            >
              {trendSymbol}
            </span>
          </div>
        )}
      </div>
      {data.length > 1 ? (
        <ReactECharts
          option={option}
          theme="politikpraxis"
          style={{ width: '100%', height: 90 }}
          opts={{ renderer: 'canvas' }}
          notMerge={false}
        />
      ) : (
        <div className={styles.noData}>Noch keine Verlaufsdaten</div>
      )}
    </div>
  );
}

export function KpiVerlaufChart({ history, current }: KpiVerlaufChartProps) {
  const hasAnyData = KPI_CONFIGS.some((cfg) => (history[cfg.key] ?? []).length > 0);

  if (!hasAnyData) {
    return (
      <div className={styles.empty}>
        KPI-Verlauf wird ab dem zweiten Spielmonat angezeigt.
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.titleRow}>
        <span className={styles.title}>KPI-Entwicklung</span>
        <span className={styles.subtitle}>Letzte {Math.max(...KPI_CONFIGS.map((c) => (history[c.key] ?? []).length))} Monate</span>
      </div>
      <div className={styles.grid}>
        {KPI_CONFIGS.map((cfg) => {
          const data = history[cfg.key] ?? [];
          // Append current value if history doesn't include it
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
