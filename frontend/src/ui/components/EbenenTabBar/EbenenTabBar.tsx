/**
 * SMA-320: 10 Tabs — agenda, bundestag, kabinett, haushalt, medien, verbaende, bundesrat, laender, kommunen, eu
 * Stufe 1: nur Agenda · Bundestag · Kabinett
 * Stufe 2: + Haushalt · Medien · Verbände · Bundesrat
 * Stufe 3: + Länder · Kommunen · EU
 * Deaktivierte Tabs: ausgegraut + Tooltip "Verfügbar ab Stufe X"
 */
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../../store/gameStore';
import type { ViewName } from '../../../core/types';
import styles from './EbenenTabBar.module.css';

const TABS: Array<{ id: ViewName; labelKey: string; icon: string; minLevel: number }> = [
  { id: 'agenda', labelKey: 'game:tabBar.agenda', icon: '📋', minLevel: 1 },
  { id: 'bundestag', labelKey: 'game:tabBar.bundestag', icon: '🏛', minLevel: 1 },
  { id: 'kabinett', labelKey: 'game:tabBar.kabinett', icon: '👥', minLevel: 1 },
  { id: 'haushalt', labelKey: 'game:tabBar.haushalt', icon: '💰', minLevel: 2 },
  { id: 'medien', labelKey: 'game:tabBar.medien', icon: '📰', minLevel: 2 },
  { id: 'verbaende', labelKey: 'game:tabBar.verbaende', icon: '🤝', minLevel: 2 },
  { id: 'bundesrat', labelKey: 'game:tabBar.bundesrat', icon: '⚖️', minLevel: 2 },
  { id: 'laender', labelKey: 'game:tabBar.laender', icon: '🗺', minLevel: 3 },
  { id: 'kommunen', labelKey: 'game:tabBar.kommunen', icon: '🏘', minLevel: 3 },
  { id: 'eu', labelKey: 'game:tabBar.eu', icon: '🇪🇺', minLevel: 3 },
];

const EBENE_COLORS: Record<string, string> = {
  agenda: 'var(--gold)',
  bundestag: 'var(--blue)',
  kabinett: 'var(--green)',
  haushalt: 'var(--warn)',
  medien: 'var(--blue)',
  verbaende: 'var(--green)',
  bundesrat: 'var(--warn)',
  laender: 'var(--land-c)',
  kommunen: 'var(--kom-c)',
  eu: 'var(--eu-c)',
  wahlkampf: 'var(--gold)',
};

function LockIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden>
      <path d="M6 1a2.5 2.5 0 0 1 2.5 2.5v1.5h.5a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h.5V3.5A2.5 2.5 0 0 1 6 1zm0 1a1.5 1.5 0 0 0-1.5 1.5v1.5h3V3.5A1.5 1.5 0 0 0 6 2z" />
    </svg>
  );
}

export function EbenenTabBar() {
  const { t } = useTranslation(['common', 'game']);
  const view = useGameStore((s) => s.state.view);
  const setView = useGameStore((s) => s.setView);
  const complexity = useGameStore((s) => s.complexity);
  const wahlkampfAktiv = useGameStore((s) => s.state.wahlkampfAktiv);

  return (
    <nav className={styles.tabBar} aria-label={t('game:tabBar.ariaLabel')}>
      <div className={styles.tabs}>
        {TABS.map((tab) => {
          const unlocked = complexity >= tab.minLevel;
          const isActive = view === tab.id;
          const color = EBENE_COLORS[tab.id] ?? 'var(--text2)';

          return (
            <button
              key={tab.id}
              type="button"
              className={`${styles.tab} ${isActive ? styles.active : ''} ${!unlocked ? styles.locked : ''}`}
              onClick={() => unlocked && setView(tab.id)}
              disabled={!unlocked}
              title={!unlocked ? t('game:tabBar.lockedTooltip', { level: tab.minLevel }) : undefined}
              style={isActive ? { '--tab-color': color } as React.CSSProperties : undefined}
            >
              <span className={styles.icon} style={{ color: unlocked ? color : 'var(--text3)' }}>
                {tab.icon}
              </span>
              <span className={styles.label}>{t(tab.labelKey)}</span>
              {!unlocked && (
                <span className={styles.lockIcon} title={t('game:tabBar.lockedTooltip', { level: tab.minLevel })}>
                  <LockIcon />
                </span>
              )}
            </button>
          );
        })}
        {wahlkampfAktiv && (
          <button
            type="button"
            className={`${styles.tab} ${view === 'wahlkampf' ? styles.active : ''}`}
            onClick={() => setView('wahlkampf')}
            style={view === 'wahlkampf' ? { '--tab-color': 'var(--gold)' } as React.CSSProperties : undefined}
          >
            <span className={styles.icon}>⭐</span>
            <span className={styles.label}>{t('game:tabBar.wahlkampf')}</span>
          </button>
        )}
      </div>
    </nav>
  );
}
