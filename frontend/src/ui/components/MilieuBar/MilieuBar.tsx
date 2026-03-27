import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import styles from './MilieuBar.module.css';

interface MilieuBarProps {
  name: string;
  value: number;
  color: string;
  /** Optional: recent approval values for sparkline */
  history?: number[];
  /** Wenn false: keine Prozentzahl im Kopf (z. B. Medien-Karten — Wert steht bereits im Kartenkopf) */
  showHeaderValue?: boolean;
  /** Monats-Delta unter dem Balken (▲/▼); nur gesetzt wenn sinnvoll, sonst weglassen */
  footerDelta?: number | null;
}

function sparklineOption(history: number[], color: string): EChartsOption {
  return {
    animation: false,
    grid: { top: 1, right: 1, bottom: 1, left: 1 },
    xAxis: { type: 'category', show: false, boundaryGap: false },
    yAxis: { type: 'value', show: false, min: 0, max: 100 },
    series: [
      {
        type: 'line',
        data: history,
        smooth: 0.4,
        symbol: 'none',
        lineStyle: { color, width: 1.5 },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: color + '55' },
              { offset: 1, color: color + '08' },
            ],
          },
        },
      },
    ],
  };
}

export function MilieuBar({
  name,
  value,
  color,
  history,
  showHeaderValue = true,
  footerDelta,
}: MilieuBarProps) {
  const clamped = Math.min(100, Math.max(0, value));
  const showSparkline = history && history.length > 2;
  const showFooter = typeof footerDelta === 'number';

  // Trend im Kopf: nur wenn dort die Prozentzahl steht und kein separates Fuß-Delta
  let trendSymbol = '→';
  let trendClass = styles.trendFlat;
  const showTrendInHeader =
    showHeaderValue && !showFooter && history && history.length >= 2;
  if (showTrendInHeader) {
    const lookback = Math.min(3, history!.length - 1);
    const diff = history![history!.length - 1] - history![history!.length - 1 - lookback];
    if (diff > 2) { trendSymbol = '↑'; trendClass = styles.trendUp; }
    else if (diff < -2) { trendSymbol = '↓'; trendClass = styles.trendDown; }
  }

  let footerSymbol = '→';
  let footerTrendClass = styles.trendFlat;
  if (showFooter) {
    if (footerDelta > 0) { footerSymbol = '▲'; footerTrendClass = styles.trendUp; }
    else if (footerDelta < 0) { footerSymbol = '▼'; footerTrendClass = styles.trendDown; }
  }

  const hasHeader =
    Boolean(name) || showHeaderValue || showTrendInHeader;

  return (
    <div className={styles.root}>
      {hasHeader && (
        <div className={styles.header}>
          <span className={styles.name}>{name}</span>
          {showHeaderValue && (
            <span className={styles.value}>{Math.round(clamped)}%</span>
          )}
          {showTrendInHeader && (
            <span className={`${styles.trend} ${trendClass}`} aria-hidden="true">
              {trendSymbol}
            </span>
          )}
        </div>
      )}
      <div className={styles.barRow}>
        <div className={styles.track}>
          <div
            className={styles.fill}
            style={{ width: `${clamped}%`, backgroundColor: color }}
          />
        </div>
        {showSparkline && (
          <ReactECharts
            option={sparklineOption(history!, color)}
            theme="politikpraxis"
            style={{ width: 48, height: 18, flexShrink: 0 }}
            opts={{ renderer: 'canvas' }}
            notMerge={false}
          />
        )}
      </div>
      {showFooter && (
        <div className={`${styles.footerDelta} ${footerTrendClass}`}>
          {footerSymbol}{' '}
          {footerDelta > 0 ? '+' : footerDelta < 0 ? '−' : ''}
          {Math.abs(footerDelta)}%
        </div>
      )}
    </div>
  );
}
