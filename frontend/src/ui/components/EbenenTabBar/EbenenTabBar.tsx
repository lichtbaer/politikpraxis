/**
 * SMA-320: 10 Tabs — agenda, bundestag, kabinett, haushalt, medien, verbaende, bundesrat, laender, kommunen, eu
 * Stufe 1: nur Agenda · Bundestag · Kabinett
 * Stufe 2: + Haushalt · Medien · Verbände · Bundesrat
 * Stufe 3: + Länder · Kommunen · EU
 * Deaktivierte Tabs: ausgegraut + Tooltip "Verfügbar ab Stufe X"
 */
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../../store/gameStore';
import { TABS } from './tabs';
import { Star } from '../../icons';
import styles from './EbenenTabBar.module.css';

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

  const offeneTabs = TABS.filter((tab) => complexity >= tab.minLevel);
  const gesperrteTabs = TABS.filter((tab) => complexity < tab.minLevel);

  return (
    <nav className={styles.tabBar} aria-label={t('game:tabBar.ariaLabel')}>
      <div className={styles.tabs}>
        {offeneTabs.map((tab) => {
          const isActive = view === tab.id;
          const color = EBENE_COLORS[tab.id] ?? 'var(--text2)';

          return (
            <button
              key={tab.id}
              type="button"
              className={`${styles.tab} ${isActive ? styles.active : ''}`}
              onClick={() => setView(tab.id)}
              style={isActive ? { '--tab-color': color } as React.CSSProperties : undefined}
            >
              <span className={styles.icon} style={{ color }}>
                <tab.Icon size={15} aria-hidden />
              </span>
              <span className={styles.label}>{t(tab.labelKey)}</span>
            </button>
          );
        })}
        {/* Gesperrte Ebenen gebuendelt: einzeln ausgegraut kommunizierte die Leiste
            vor allem, was der Spieler *nicht* tun kann — auf Stufe 1 waren das
            sieben von zehn Tabs. Die Progressionsneugier bleibt, die Navigation
            wird wieder lesbar. */}
        {gesperrteTabs.length > 0 && (
          <span
            className={`${styles.tab} ${styles.lockedSummary}`}
            title={gesperrteTabs
              .map((tab) => `${t(tab.labelKey)} — ${t('game:tabBar.lockedTooltip', { level: tab.minLevel })}`)
              .join('\n')}
          >
            <span className={styles.lockIcon}>
              <LockIcon />
            </span>
            <span className={styles.label}>
              {t('game:tabBar.gesperrtSammel', { count: gesperrteTabs.length })}
            </span>
          </span>
        )}
        {wahlkampfAktiv && (
          <button
            type="button"
            className={`${styles.tab} ${view === 'wahlkampf' ? styles.active : ''}`}
            onClick={() => setView('wahlkampf')}
            style={view === 'wahlkampf' ? { '--tab-color': 'var(--gold)' } as React.CSSProperties : undefined}
          >
            <span className={styles.icon} style={{ color: 'var(--gold)' }}>
              <Star size={15} aria-hidden />
            </span>
            <span className={styles.label}>{t('game:tabBar.wahlkampf')}</span>
          </button>
        )}
      </div>
    </nav>
  );
}
