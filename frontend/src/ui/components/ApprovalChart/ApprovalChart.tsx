import styles from './ApprovalChart.module.css';

interface ApprovalChartProps {
  history: number[];
  threshold: number;
}

const PAD_LEFT = 32;
const PAD_RIGHT = 8;
const PAD_TOP = 8;
const PAD_BOTTOM = 20;

const Y_LABELS = [0, 25, 50, 75, 100];
const X_LABELS = [1, 12, 24, 36, 48];

export function ApprovalChart({ history, threshold }: ApprovalChartProps) {
  const viewW = 300;
  const viewH = 120;
  const chartW = viewW - PAD_LEFT - PAD_RIGHT;
  const chartH = viewH - PAD_TOP - PAD_BOTTOM;

  const toX = (month: number) => PAD_LEFT + ((month - 1) / 47) * chartW;
  const toY = (val: number) => PAD_TOP + chartH - (val / 100) * chartH;

  // Build segments colored by threshold
  const segments: { points: string; above: boolean }[] = [];
  if (history.length > 1) {
    let currentAbove = history[0] >= threshold;
    let segPoints = [`${toX(1)},${toY(history[0])}`];

    for (let i = 1; i < history.length; i++) {
      const above = history[i] >= threshold;
      const x = toX(i + 1);
      const y = toY(history[i]);

      if (above !== currentAbove) {
        // Interpolate crossing point
        const prevVal = history[i - 1];
        const curVal = history[i];
        const ratio = (threshold - prevVal) / (curVal - prevVal);
        const crossX = toX(i) + ratio * (toX(i + 1) - toX(i));
        const crossY = toY(threshold);

        segPoints.push(`${crossX},${crossY}`);
        segments.push({ points: segPoints.join(' '), above: currentAbove });

        segPoints = [`${crossX},${crossY}`, `${x},${y}`];
        currentAbove = above;
      } else {
        segPoints.push(`${x},${y}`);
      }
    }
    segments.push({ points: segPoints.join(' '), above: currentAbove });
  }

  const thresholdY = toY(threshold);

  return (
    <div className={styles.container}>
      <svg
        className={styles.chart}
        viewBox={`0 0 ${viewW} ${viewH}`}
        preserveAspectRatio="none"
      >
        {/* Y-axis labels and grid lines */}
        {Y_LABELS.map((v) => (
          <g key={`y-${v}`}>
            <line
              x1={PAD_LEFT}
              y1={toY(v)}
              x2={viewW - PAD_RIGHT}
              y2={toY(v)}
              stroke="var(--border)"
              strokeWidth="0.5"
              opacity="0.4"
            />
            <text
              x={PAD_LEFT - 4}
              y={toY(v) + 1}
              textAnchor="end"
              fill="var(--text2)"
              fontSize="7"
              dominantBaseline="middle"
            >
              {v}%
            </text>
          </g>
        ))}

        {/* X-axis labels */}
        {X_LABELS.map((m) => (
          <text
            key={`x-${m}`}
            x={toX(m)}
            y={viewH - 2}
            textAnchor="middle"
            fill="var(--text2)"
            fontSize="7"
          >
            {m}
          </text>
        ))}

        {/* Threshold dashed line */}
        <line
          x1={PAD_LEFT}
          y1={thresholdY}
          x2={viewW - PAD_RIGHT}
          y2={thresholdY}
          stroke="var(--text2)"
          strokeWidth="0.8"
          strokeDasharray="4 2"
          opacity="0.7"
        />

        {/* Colored line segments */}
        {segments.map((seg, i) => (
          <polyline
            key={i}
            points={seg.points}
            fill="none"
            stroke={seg.above ? 'var(--green)' : 'var(--red)'}
            strokeWidth="1.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}

        {/* Single-point dot when only 1 data point */}
        {history.length === 1 && (
          <circle
            cx={toX(1)}
            cy={toY(history[0])}
            r="2"
            fill={history[0] >= threshold ? 'var(--green)' : 'var(--red)'}
          />
        )}
      </svg>
    </div>
  );
}
