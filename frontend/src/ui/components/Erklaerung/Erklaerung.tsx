/**
 * SMA-331: Universeller Wrapper für Fachbegriffe mit Tooltip-Erklärung.
 * Inline = dezente gepunktete Unterlinie, Icon = kleines ?-Icon daneben.
 * Texte kommen lokalisiert aus `game:begriffe.<key>.{label,text}`.
 */
import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { BEGRIFF_KEYS } from '../../../constants/begriffe';
import styles from './Erklaerung.module.css';

interface ErklaerungProps {
  /** Key aus BEGRIFF_KEYS */
  begriff: string;
  /** Optional: eigener Label-Text statt des Begriff-Labels */
  kinder?: React.ReactNode;
  /** true = unterstrichen (inline), false = ?-Icon */
  inline?: boolean;
}

export function Erklaerung({ begriff, kinder, inline = true }: ErklaerungProps) {
  const { t } = useTranslation('game');
  const [showTooltip, setShowTooltip] = useState(false);
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const bekannt = BEGRIFF_KEYS.has(begriff);

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

  if (!bekannt) {
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
      {kinder ?? t(`begriffe.${begriff}.label`)}
      {!inline && <span className={styles.icon} aria-hidden>?</span>}
      {showTooltip && (
        <span
          id={`erklaerung-${begriff}`}
          className={styles.tooltip}
          role="tooltip"
        >
          {t(`begriffe.${begriff}.text`)}
        </span>
      )}
    </span>
  );
}
