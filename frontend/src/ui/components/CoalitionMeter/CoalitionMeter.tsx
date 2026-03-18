import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import styles from './CoalitionMeter.module.css';

interface CoalitionMeterProps {
  value: number;
}

function getLabel(value: number): string {
  if (value >= 60) return 'Koalition stabil';
  if (value >= 35) return 'Spannungen erkennbar';
  if (value >= 15) return 'Koalitionskrise droht';
  return 'Koalition am Limit';
}

function getColor(value: number): string {
  if (value >= 60) return '#5a9870';
  if (value >= 35) return '#c8a84b';
  return '#c05848';
}

export function CoalitionMeter({ value }: CoalitionMeterProps) {
  const clamped = Math.min(100, Math.max(0, value));
  const color = getColor(clamped);

  const option: EChartsOption = useMemo(() => ({
    animation: true,
    animationDuration: 800,
    series: [
      {
        type: 'gauge',
        startAngle: 180,
        endAngle: 0,
        min: 0,
        max: 100,
        radius: '100%',
        center: ['50%', '88%'],
        splitNumber: 4,
        axisLine: {
          lineStyle: {
            width: 10,
            color: [
              [0.15, '#c05848'],
              [0.35, '#c05848'],
              [0.60, '#c8a84b'],
              [1.0,  '#5a9870'],
            ],
          },
        },
        pointer: {
          icon: 'path://M2090.36389,615.30999 L2090.36389,615.30999 C2091.48372,615.30999 2092.40383,616.2301 2092.40383,617.34993 L2092.40383,778.89997 C2092.40383,780.01980 2091.48372,780.93991 2090.36389,780.93991 C2089.24406,780.93991 2088.32395,780.01980 2088.32395,778.89997 L2088.32395,617.34993 C2088.32395,616.23010 2089.24406,615.30999 2090.36389,615.30999 Z',
          length: '60%',
          width: 4,
          offsetCenter: [0, '-8%'],
          itemStyle: { color: color },
        },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        detail: {
          valueAnimation: true,
          formatter: '{value}%',
          color: color,
          fontSize: 14,
          fontFamily: 'var(--mono)',
          offsetCenter: [0, '-30%'],
        },
        title: { show: false },
        data: [{ value: Math.round(clamped) }],
      },
    ],
  }), [clamped, color]);

  const isCritical = clamped < 25;

  return (
    <div className={`${styles.root} ${isCritical ? styles.critical : ''}`}>
      <ReactECharts
        option={option}
        theme="politikpraxis"
        style={{ width: '100%', height: 100 }}
        opts={{ renderer: 'canvas' }}
        notMerge={false}
      />
      <div className={styles.statusLabel} style={{ color }}>
        {isCritical && <span className={styles.warningIcon}>&#9888;</span>}
        {getLabel(clamped)}
      </div>
      {clamped < 15 && (
        <div className={styles.collapseWarning}>
          Koalitionsbruch droht!
        </div>
      )}
    </div>
  );
}
