/**
 * Abstimmungsergebnis als Ja/Nein-Split mit Mehrheitsmarke.
 *
 * Die Ja-Quote ist die wichtigste Zahl der Gesetz-Karte — geht das Gesetz durch
 * oder nicht. Vorher war sie ein durchgehender 4-px-Goldbalken über die volle
 * Kartenbreite: optisch ein Fortschrittsbalken, ohne Nein-Anteil und ohne die
 * 50-%-Schwelle, an der sich die Frage entscheidet.
 */
import { useTranslation } from 'react-i18next';
import styles from './AbstimmungsBalken.module.css';

export interface AbstimmungsBalkenProps {
  ja: number;
  nein: number;
  /**
   * Ja-Quote nach Boni/Mali in Prozent. Weicht sie von der Rohquote ab, zeigt der
   * Balken zusätzlich eine Marke an dieser Stelle.
   */
  effektivProzent?: number;
  /** Mehrheitsschwelle in Prozent (Standard: einfache Mehrheit). */
  schwelle?: number;
}

export function AbstimmungsBalken({
  ja,
  nein,
  effektivProzent,
  schwelle = 50,
}: AbstimmungsBalkenProps) {
  const { t } = useTranslation('game');
  const total = ja + nein;
  const prozent = total > 0 ? Math.round((ja / total) * 100) : 0;
  const effektiv = effektivProzent ?? prozent;
  const reicht = effektiv >= schwelle;
  const zeigeEffektiv = Math.abs(effektiv - prozent) >= 1;

  const label = t('abstimmung.balkenAria', {
    ja,
    nein,
    prozent,
    schwelle,
    status: t(reicht ? 'abstimmung.reicht' : 'abstimmung.reichtNicht'),
  });

  return (
    <div className={styles.root}>
      <div className={styles.row}>
        <span className={`${styles.seite} ${styles.ja}`}>
          {t('abstimmung.ja')} <strong>{ja}</strong>
        </span>
        <div
          className={`${styles.track} ${reicht ? styles.trackReicht : styles.trackReichtNicht}`}
          role="img"
          aria-label={label}
        >
          <div className={styles.fillJa} style={{ width: `${prozent}%` }} />
          <div className={styles.fillNein} style={{ width: `${100 - prozent}%` }} />
          <span className={styles.schwelle} style={{ left: `${schwelle}%` }} aria-hidden="true" />
          {zeigeEffektiv && (
            <span
              className={styles.effektivMarke}
              style={{ left: `${Math.min(100, Math.max(0, effektiv))}%` }}
              aria-hidden="true"
            />
          )}
        </div>
        <span className={`${styles.seite} ${styles.nein}`}>
          <strong>{nein}</strong> {t('abstimmung.nein')}
        </span>
      </div>
      <div className={styles.unterzeile}>
        <span className={reicht ? styles.statusReicht : styles.statusReichtNicht}>
          {t(reicht ? 'abstimmung.reicht' : 'abstimmung.reichtNicht')}
        </span>
        <span className={styles.schwellenLabel}>
          {t('abstimmung.schwelle', { schwelle })}
        </span>
      </div>
    </div>
  );
}
