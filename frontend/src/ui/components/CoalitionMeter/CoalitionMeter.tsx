import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import ReactEChartsCore from 'echarts-for-react/esm/core';
import type { EChartsOption } from 'echarts';
import { echarts } from '../../lib/echarts';
import { useChartTheme } from '../../hooks/useChartTheme';
import type { ChartTokens } from '../../lib/chartTokens';
import styles from './CoalitionMeter.module.css';

interface CoalitionMeterProps {
  value: number;
}

function getLabelKey(value: number): string {
  if (value >= 60) return 'coalition.stable';
  if (value >= 35) return 'coalition.tensions';
  if (value >= 15) return 'coalition.crisis';
  return 'coalition.atLimit';
}

/** Ampelfarbe der Koalitionsstabilität — aus den Theme-Token, nicht fest verdrahtet. */
function getColor(value: number, tokens: ChartTokens): string {
  if (value >= 60) return tokens.green;
  if (value >= 35) return tokens.warn;
  return tokens.red;
}

export function CoalitionMeter({ value }: CoalitionMeterProps) {
  const { t } = useTranslation('game');
  const { theme: chartTheme, tokens } = useChartTheme();
  const clamped = Math.min(100, Math.max(0, value));
  const color = getColor(clamped, tokens);

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
              [0.15, tokens.red],
              [0.35, tokens.red],
              [0.60, tokens.warn],
              [1.0,  tokens.green],
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
          fontFamily: tokens.mono,
          offsetCenter: [0, '-30%'],
        },
        title: { show: false },
        data: [{ value: Math.round(clamped) }],
      },
    ],
  }), [clamped, color, tokens]);

  const isCritical = clamped < 25;
  const chartAriaLabel = t('coalition.ariaLabel', {
    value: Math.round(clamped),
    status: t(getLabelKey(clamped)),
  });

  return (
    <div className={`${styles.root} ${isCritical ? styles.critical : ''}`}>
      <div role="img" aria-label={chartAriaLabel} style={{ width: '100%' }}>
        <ReactEChartsCore
          echarts={echarts}
          option={option}
          theme={chartTheme}
          style={{ width: '100%', height: 100 }}
          opts={{ renderer: 'canvas' }}
          notMerge={false}
        />
      </div>
      <div className={styles.statusLabel} style={{ color }}>
        {isCritical && <span className={styles.warningIcon}>&#9888;</span>}
        {t(getLabelKey(clamped))}
      </div>
      {clamped < 15 && (
        <div className={styles.collapseWarning}>
          {t('coalition.collapseWarning')}
        </div>
      )}
    </div>
  );
}
