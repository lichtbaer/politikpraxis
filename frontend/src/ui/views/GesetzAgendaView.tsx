/**
 * SMA-274: Gesetz-Agenda View — Alle Gesetze auf allen Stufen sichtbar.
 * SMA-290: Stufe 3+: Gruppierung (VORBEREITUNG LÄUFT | BEREIT ZUM EINBRINGEN | NOCH KEINE VORBEREITUNG)
 * SMA-287: Top-3 Gesetze mit Empfohlen-Badge (Kongruenz zur Spieler-Ausrichtung)
 * SMA-293: Clustering nach Politikfeld + personalisierte Reihenfolge nach Ideologie (alle Stufen)
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../store/gameStore';
import { useContentStore } from '../../stores/contentStore';
import { AgendaCard } from '../components/AgendaCard/AgendaCard';
import { featureActive } from '../../core/systems/features';
import {
  gruppiereNachPolitikfeld,
  getTop3Empfohlen,
  POLITIKFELD_ICONS,
} from '../../core/gesetzAgenda';
import styles from './GesetzAgendaView.module.css';

export function GesetzAgendaView() {
  const { t } = useTranslation('game');
  const { state, ausrichtung, complexity } = useGameStore();
  const politikfelder = useContentStore((s) => s.politikfelder);
  const showCollapsible = complexity >= 2;
  const showDruck = featureActive(complexity, 'politikfeld_druck');
  const politikfeldDruck = state.politikfeldDruck ?? {};

  const clusters = gruppiereNachPolitikfeld(state.gesetze, politikfelder, ausrichtung);
  const top3Empfohlen = getTop3Empfohlen(state.gesetze, ausrichtung);

  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());

  const toggleFeld = (feldId: string) => {
    if (!showCollapsible) return;
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(feldId)) next.delete(feldId);
      else next.add(feldId);
      return next;
    });
  };

  return (
    <div className={styles.root}>
      <h1 className={styles.title}>{t('game:gesetzAgenda.title')}</h1>

      {clusters.length === 0 ? (
        <p className={styles.leer}>{t('game:gesetzAgenda.leer')}</p>
      ) : (
        <div className={styles.clusterList}>
          {clusters.map(({ feldId, gesetze }) => {
            const isCollapsed = showCollapsible && collapsedIds.has(feldId);
            const druck = showDruck ? (politikfeldDruck[feldId] ?? 0) : 0;
            const icon = POLITIKFELD_ICONS[feldId] ?? '📋';
            const feldName =
              feldId === '_ohne_feld'
                ? t('game:gesetzAgenda.ohneFeld', 'Sonstige')
                : t(`game:politikfeld.${feldId}`, feldId);

            return (
              <section key={feldId} className={styles.politikfeldSection}>
                <header
                  className={`${styles.politikfeldHeader} ${showCollapsible ? styles.clickable : ''}`}
                  onClick={() => toggleFeld(feldId)}
                  role={showCollapsible ? 'button' : undefined}
                  aria-expanded={!isCollapsed}
                >
                  <span className={styles.politikfeldIcon}>{icon}</span>
                  <span className={styles.politikfeldName}>{feldName}</span>
                  <span className={styles.politikfeldCount}>
                    ({gesetze.length} {t('game:gesetzAgenda.gesetzeCount', 'Gesetze')})
                  </span>
                  {showDruck && (
                    <div className={styles.druckBar}>
                      <div
                        className={`${styles.druckFill} ${druck > 70 ? styles.kritisch : druck > 40 ? styles.warn : styles.ok}`}
                        style={{ width: `${Math.min(100, druck)}%` }}
                      />
                    </div>
                  )}
                  {showCollapsible && (
                    <span className={styles.toggle}>{isCollapsed ? '▶' : '▼'}</span>
                  )}
                </header>
                {!isCollapsed && (
                  <div className={styles.list}>
                    {gesetze.map((law) => (
                      <AgendaCard
                        key={law.id}
                        law={law}
                        isRecommended={top3Empfohlen.has(law.id)}
                        showKongruenz={complexity >= 2}
                      />
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
