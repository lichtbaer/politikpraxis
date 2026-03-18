import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import styles from './MilieuBar.module.css';

interface MilieuBarProps {
  name: string;
  value: number;
  color: string;
  /** Optional: recent approval values for sparkline */
  history?: number[];
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

export function MilieuBar({ name, value, color, history }: MilieuBarProps) {
  const clamped = Math.min(100, Math.max(0, value));
  const showSparkline = history && history.length > 2;

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <span className={styles.name}>{name}</span>
        <span className={styles.value}>{Math.round(clamped)}%</span>
      </div>
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
    </div>
  );
}
