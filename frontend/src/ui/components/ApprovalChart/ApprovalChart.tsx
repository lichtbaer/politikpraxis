import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import styles from './ApprovalChart.module.css';

interface ApprovalChartProps {
  history: number[];
  threshold: number;
  /** Current month number (1-based) for label display */
  currentMonth?: number;
}

export function ApprovalChart({ history, threshold, currentMonth }: ApprovalChartProps) {
  const option: EChartsOption = useMemo(() => {
    const months = history.map((_, i) => i + 1);
    const latestValue = history.length > 0 ? history[history.length - 1] : null;

    // Split data into above/below threshold segments for dual-color rendering
    const aboveData = history.map((v) => (v >= threshold ? v : null));
    const belowData = history.map((v) => (v < threshold ? v : null));

    return {
      animation: true,
      animationDuration: 600,
      grid: {
        top: 8,
        right: 6,
        bottom: 20,
        left: 28,
        containLabel: false,
      },
      xAxis: {
        type: 'category',
        data: months,
        boundaryGap: false,
        axisLabel: {
          color: '#888',
          fontSize: 8,
          interval: (index: number) => [0, 11, 23, 35, 47].includes(index),
          formatter: (v: string) => {
            const m = Number(v);
            const year = 2025 + Math.floor((m - 1) / 12);
            return `${m} (${year})`;
          },
        },
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: 100,
        interval: 25,
        axisLabel: {
          color: '#888',
          fontSize: 8,
          formatter: '{value}%',
        },
        splitLine: {
          lineStyle: { color: '#333', type: 'dashed', width: 0.5 },
        },
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#1e1c18',
        borderColor: '#444',
        borderWidth: 1,
        textStyle: { color: '#d0cfc8', fontSize: 11 },
        formatter: (params: unknown) => {
          const p = params as Array<{ dataIndex: number; value: number | null }>;
          const first = p.find((x) => x.value != null);
          if (!first) return '';
          const month = first.dataIndex + 1;
          const val = first.value as number;
          return `Monat ${month}: <b>${val.toFixed(1)}%</b>`;
        },
      },
      series: [
        // Above-threshold segment (green)
        {
          type: 'line',
          data: aboveData,
          smooth: 0.3,
          symbol: 'none',
          lineStyle: { color: '#5a9870', width: 2 },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(90,152,112,0.35)' },
                { offset: 1, color: 'rgba(90,152,112,0.04)' },
              ],
            },
          },
          connectNulls: false,
          markLine: {
            silent: true,
            symbol: 'none',
            data: [{ yAxis: threshold }],
            lineStyle: { color: '#888', type: 'dashed', width: 1 },
            label: {
              show: true,
              position: 'insideEndTop',
              formatter: `${threshold}%`,
              color: '#888',
              fontSize: 8,
            },
          },
        },
        // Below-threshold segment (red)
        {
          type: 'line',
          data: belowData,
          smooth: 0.3,
          symbol: 'none',
          lineStyle: { color: '#c05848', width: 2 },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(192,88,72,0.35)' },
                { offset: 1, color: 'rgba(192,88,72,0.04)' },
              ],
            },
          },
          connectNulls: false,
        },
      ],
    };
  }, [history, threshold]);

  const latestVal = history.length > 0 ? history[history.length - 1] : null;

  return (
    <div className={styles.container}>
      {latestVal !== null && (
        <div className={styles.currentValue}>
          <span className={styles.currentLabel}>Aktuell:</span>
          <span
            className={styles.currentNumber}
            style={{ color: latestVal >= threshold ? '#5a9870' : '#c05848' }}
          >
            {latestVal.toFixed(1)}%
          </span>
        </div>
      )}
      <ReactECharts
        option={option}
        theme="politikpraxis"
        style={{ width: '100%', height: 120 }}
        opts={{ renderer: 'canvas' }}
        notMerge={false}
      />
    </div>
  );
}
