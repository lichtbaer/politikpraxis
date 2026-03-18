import { useState, useRef, useEffect } from 'react';
import type { TickLogEntry, KPI } from '../../../core/types';
import styles from './KPITile.module.css';

interface KPITileProps {
  label: string;
  value: number;
  prevValue: number | null;
  suffix: string;
  inverted: boolean;
  barPercent: number;
  barColor: string;
  /** Erklärung der Änderungen aus dem Tick-Log */
  changeReasons?: TickLogEntry[];
  /** KPI-Schlüssel für Tooltip-Beschreibung */
  kpiKey?: keyof KPI;
  /** Historische Werte für Trendanzeige (letzte 3 Monate) */
  history?: number[];
}

function getTrendArrow(history: number[], inverted: boolean): { symbol: string; class: string; label: string } | null {
  if (history.length < 3) return null;
  const recent = history.slice(-3);
  const diffs = [recent[1] - recent[0], recent[2] - recent[1]];
  const avgDiff = (diffs[0] + diffs[1]) / 2;
  if (Math.abs(avgDiff) < 0.15) return { symbol: '→', class: 'trendFlat', label: 'Stabil' };
  const improving = inverted ? avgDiff < 0 : avgDiff > 0;
  if (improving) {
    return Math.abs(avgDiff) > 1
      ? { symbol: '⬆', class: 'trendStrongUp', label: 'Stark steigend' }
      : { symbol: '↗', class: 'trendUp', label: 'Steigend' };
  }
  return Math.abs(avgDiff) > 1
    ? { symbol: '⬇', class: 'trendStrongDown', label: 'Stark fallend' }
    : { symbol: '↘', class: 'trendDown', label: 'Fallend' };
}

const KPI_DESCRIPTIONS: Record<keyof KPI, string> = {
  al: 'Niedrig = gut. Beeinflusst durch Konjunktur und Gesetze.',
  hh: 'Positiv = Überschuss, negativ = Defizit.',
  gi: 'Niedrig = weniger Ungleichheit. Beeinflusst durch Sozialpolitik.',
  zf: 'Hoch = zufriedene Bevölkerung. Beeinflusst durch alle KPIs.',
};

function getDeltaClass(
  value: number,
  prevValue: number,
  inverted: boolean
): 'better' | 'worse' | 'same' {
  if (value === prevValue) return 'same';
  const improved = inverted ? value < prevValue : value > prevValue;
  return improved ? 'better' : 'worse';
}

function formatDelta(value: number, prevValue: number): string {
  const diff = value - prevValue;
  if (diff === 0) return '—';
  const sign = diff > 0 ? '+' : '';
  return `${sign}${diff.toFixed(1)}`;
}

export function KPITile({
  label,
  value,
  prevValue,
  suffix,
  inverted,
  barPercent,
  barColor,
  changeReasons,
  kpiKey,
  history,
}: KPITileProps) {
  const [showPopover, setShowPopover] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showPopover) return;
    const handleClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setShowPopover(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showPopover]);

  const delta =
    prevValue !== null
      ? { text: formatDelta(value, prevValue), class: getDeltaClass(value, prevValue, inverted) }
      : null;

  /* SMA-302: Flash-Animation wenn Wert sich geändert hat */
  const showFlash = prevValue !== null && value !== prevValue;
  const flashClass =
    showFlash && delta
      ? delta.class === 'better'
        ? styles.valueFlashPos
        : delta.class === 'worse'
          ? styles.valueFlashNeg
          : ''
      : '';

  const hasPopoverContent = kpiKey || (changeReasons && changeReasons.length > 0);

  return (
    <div
      className={styles.root}
      ref={rootRef}
      onClick={() => hasPopoverContent && setShowPopover(!showPopover)}
      onMouseEnter={() => hasPopoverContent && setShowPopover(true)}
      onMouseLeave={() => setShowPopover(false)}
      style={hasPopoverContent ? { cursor: 'pointer' } : undefined}
    >
      <span className={styles.label}>{label}</span>
      <div className={styles.valueRow}>
        <span className={`${styles.value} ${flashClass}`}>
          {value.toFixed(1)}
          {suffix}
        </span>
        {delta && (
          <span className={styles[delta.class]}>{delta.text}</span>
        )}
        {history && (() => {
          const trend = getTrendArrow(history, inverted);
          if (!trend) return null;
          return <span className={styles[trend.class]} title={trend.label}>{trend.symbol}</span>;
        })()}
      </div>
      <div className={styles.track}>
        <div
          className={styles.fill}
          style={{
            width: `${Math.max(0, Math.min(100, barPercent))}%`,
            backgroundColor: barColor,
          }}
        />
      </div>
      {showPopover && hasPopoverContent && (
        <div className={styles.popover}>
          {kpiKey && <p className={styles.popoverDesc}>{KPI_DESCRIPTIONS[kpiKey]}</p>}
          {changeReasons && changeReasons.length > 0 && (
            <div className={styles.popoverChanges}>
              <span className={styles.popoverTitle}>Änderungen:</span>
              {changeReasons.map((r, i) => (
                <div key={i} className={styles.popoverRow}>
                  <span className={styles.popoverSource}>{r.source}</span>
                  <span className={r.delta > 0 ? styles.popoverPos : styles.popoverNeg}>
                    {r.delta > 0 ? '+' : ''}{r.delta.toFixed(1)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
