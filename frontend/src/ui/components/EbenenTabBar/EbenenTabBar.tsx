import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../../store/gameStore';
import { featureActive } from '../../../core/systems/features';
import type { ViewName } from '../../../core/types';
import styles from './EbenenTabBar.module.css';

const EBENE_IDS: ViewName[] = ['agenda', 'bundesrat', 'eu', 'land', 'kommune', 'verbaende', 'medien', 'wahlkampf'];

/** SMA-291: Bundesrat-Tab komplett ausblenden bei Stufe 1 (nicht nur sperren) */
function isBundesratTabVisible(complexity: number): boolean {
  return featureActive(complexity, 'bundesrat_sichtbar');
}

const EBENE_FEATURES: Partial<Record<ViewName, string>> = {
  bundesrat: 'bundesrat_sichtbar',
  eu: 'eu_route',
  land: 'laender_pilot',
  kommune: 'kommunal_pilot',
  verbaende: 'verbands_lobbying',
  medien: 'media_agenda',
  wahlkampf: 'wahlkampf',
};

const FEATURE_LEVELS: Record<string, number> = {
  bundesrat_sichtbar: 2,
  eu_route: 2,
  laender_pilot: 2,
  kommunal_pilot: 2,
  verbands_lobbying: 3,
  media_agenda: 4,
  wahlkampf: 1,
};

const EBENE_COLORS: Record<string, string> = {
  agenda: 'var(--gold)',
  eu: 'var(--eu-c)',
  land: 'var(--land-c)',
  kommune: 'var(--kom-c)',
  medien: 'var(--blue)',
  bundesrat: 'var(--warn)',
  verbaende: 'var(--green)',
  wahlkampf: 'var(--gold)',
};

function LockIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden>
      <path d="M6 1a2.5 2.5 0 0 1 2.5 2.5v1.5h.5a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h.5V3.5A2.5 2.5 0 0 1 6 1zm0 1a1.5 1.5 0 0 0-1.5 1.5v1.5h3V3.5A1.5 1.5 0 0 0 6 2z" />
    </svg>
  );
}

function EbeneIcon({ id, color }: { id: string; color: string }) {
  const icons: Record<string, React.ReactNode> = {
    agenda: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden>
        <path d="M2 2h10v1H2V2zm0 3h10v1H2V5zm0 3h7v1H2V8zm0 3h5v1H2v-1z" />
      </svg>
    ),
    bundesrat: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden>
        <path d="M2 2h10v2H2V2zm0 4h10v6H2V6zm1 1v4h3V7H3zm5 0v4h3V7H8z" />
      </svg>
    ),
    eu: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden>
        <path d="M7 1l1.5 4.5L13 6l-4 3.5L10 14 7 11 4 14l1-4.5L1 6l4.5-.5L7 1z" />
      </svg>
    ),
    land: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden>
        <path d="M2 2h10v10H2V2zm1 1v8h8V3H3z" />
      </svg>
    ),
    kommune: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden>
        <path d="M2 2h4v2H2V2zm6 0h4v2H8V2zM2 6h4v2H2V6zm6 0h4v2H8V6zM2 10h4v2H2v-2zm6 0h4v2H8v-2z" />
      </svg>
    ),
    verbaende: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden>
        <path d="M2 2h3v3H2V2zm7 0h3v3H9V2zM2 9h3v3H2V9zm7 0h3v3H9V9zM5 5h4v4H5V5z" />
      </svg>
    ),
    medien: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden>
        <path d="M2 2h10v1H2V2zm0 3h10v6H2V5zm1 1v4h8V6H3z" />
      </svg>
    ),
    wahlkampf: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden>
        <path d="M7 1l1 3 3 .5-2 2 .5 3L7 8l-2.5 1.5.5-3-2-2 3-.5L7 1z" />
      </svg>
    ),
  };
  return (
    <span className={styles.icon} style={{ color }}>
      {icons[id] ?? <span className={styles.dot} style={{ backgroundColor: color }} />}
    </span>
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
        {EBENE_IDS.filter((id) => {
          if (id === 'wahlkampf' && !wahlkampfAktiv) return false;
          if (id === 'bundesrat' && !isBundesratTabVisible(complexity)) return false;
          return true;
        }).map((id) => {
          const feature = EBENE_FEATURES[id];
          const unlocked = !feature || featureActive(complexity, feature);
          const lockLevel = feature ? FEATURE_LEVELS[feature] : 0;
          const color = EBENE_COLORS[id];
          const isActive = view === id;

          return (
            <button
              key={id}
              type="button"
              className={`${styles.tab} ${isActive ? styles.active : ''} ${!unlocked ? styles.locked : ''}`}
              onClick={() => unlocked && setView(id)}
              disabled={!unlocked}
              title={!unlocked ? t('game:tabBar.lockedTooltip', { level: lockLevel }) : undefined}
              style={isActive ? { '--tab-color': color } as React.CSSProperties : undefined}
            >
              <EbeneIcon id={id} color={unlocked ? color : 'var(--text3)'} />
              <span className={styles.label}>{t(`game.ebenen.${id}`, { ns: 'common' })}</span>
              {!unlocked && (
                <span className={styles.lockIcon} title={t('game:tabBar.lockedTooltip', { level: lockLevel })}>
                  <LockIcon />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
