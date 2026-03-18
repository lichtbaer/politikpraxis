/**
 * SMA-331: Universeller Wrapper für Fachbegriffe mit Tooltip-Erklärung.
 * Inline = dezente gepunktete Unterlinie, Icon = kleines ?-Icon daneben.
 */
import { useState, useRef, useEffect } from 'react';
import { BEGRIFFE } from '../../../constants/begriffe';
import styles from './Erklaerung.module.css';

interface ErklaerungProps {
  /** Key aus BEGRIFFE-Dictionary */
  begriff: string;
  /** Optional: eigener Label-Text statt BEGRIFFE[label] */
  kinder?: React.ReactNode;
  /** true = unterstrichen (inline), false = ?-Icon */
  inline?: boolean;
}

export function Erklaerung({ begriff, kinder, inline = true }: ErklaerungProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const erklaerung = BEGRIFFE[begriff];

  useEffect(() => {
    if (!showTooltip) return;
    const handleClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowTooltip(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showTooltip]);

  if (!erklaerung) {
    return <>{kinder ?? begriff}</>;
  }

  return (
    <span
      ref={wrapperRef}
      className={`${styles.wrapper} ${inline ? styles.wrapperInline : styles.wrapperIcon}`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      role="tooltip"
      aria-describedby={showTooltip ? `erklaerung-${begriff}` : undefined}
    >
      {kinder ?? erklaerung.label}
      {!inline && <span className={styles.icon} aria-hidden>?</span>}
      {showTooltip && (
        <span
          id={`erklaerung-${begriff}`}
          className={styles.tooltip}
          role="tooltip"
        >
          {erklaerung.text}
          {erklaerung.link && (
            <a
              href={erklaerung.link}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.tooltipLink}
              onClick={(e) => e.stopPropagation()}
            >
              Mehr erfahren →
            </a>
          )}
        </span>
      )}
    </span>
  );
}
