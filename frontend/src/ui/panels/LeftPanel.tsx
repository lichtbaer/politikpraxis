import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../store/gameStore';
import { featureActive } from '../../core/systems/features';
import { CharacterRow } from '../components/CharacterRow/CharacterRow';
import { CoalitionMeter } from '../components/CoalitionMeter/CoalitionMeter';
import { MilieuSidebar } from '../components/MilieuSidebar/MilieuSidebar';
import { PolitikfeldGrid } from '../components/PolitikfeldGrid/PolitikfeldGrid';
import { KoalitionspartnerPanel } from '../components/KoalitionspartnerPanel/KoalitionspartnerPanel';
import styles from './LeftPanel.module.css';

const EBENE_IDS = ['agenda', 'eu', 'land', 'kommune', 'medien', 'bundesrat', 'verbaende'] as const;
const EBENE_COLORS: Record<string, string> = {
  agenda: 'var(--gold)',
  eu: 'var(--eu-c)',
  land: 'var(--land-c)',
  kommune: 'var(--kom-c)',
  medien: 'var(--blue)',
  bundesrat: 'var(--warn)',
  verbaende: 'var(--green)',
};

export function LeftPanel() {
  const { t } = useTranslation(['common', 'game']);
  const zustG = useGameStore((s) => s.state.zust.g);
  const electionThreshold = useGameStore((s) => s.state.electionThreshold ?? 40);
  const coalition = useGameStore((s) => s.state.coalition);
  const chars = useGameStore((s) => s.state.chars);
  const view = useGameStore((s) => s.state.view);
  const setView = useGameStore((s) => s.setView);
  const complexity = useGameStore((s) => s.complexity);

  const EBENEN = EBENE_IDS.filter((id) => {
    if (id === 'bundesrat' && !featureActive(complexity, 'bundesrat_simple')) return false;
    if (id === 'verbaende' && !featureActive(complexity, 'verbands_lobbying')) return false;
    return true;
  }).map((id) => ({ id, label: t(`game.ebenen.${id}`, { ns: 'common' }), color: EBENE_COLORS[id] }));

  return (
    <aside className={styles.panel}>
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>{t('game:leftPanel.wahlprognose')}</h3>
        <div className={styles.wahlprognose}>
          <span
            className={styles.wahlprognoseValue}
            style={{ color: zustG >= electionThreshold ? 'var(--green)' : zustG >= electionThreshold - 5 ? 'var(--warn)' : 'var(--red)' }}
          >{Math.round(zustG)}%</span>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{
                width: `${Math.min(100, zustG)}%`,
                background: zustG >= electionThreshold ? 'var(--green)' : zustG >= electionThreshold - 5 ? 'var(--warn)' : 'var(--red)',
              }}
            />
          </div>
          <span className={styles.target}>{t('game:leftPanel.target', { percent: electionThreshold })}</span>
        </div>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>{t('game:leftPanel.koalitionsstabilitaet')}</h3>
        <CoalitionMeter value={coalition} />
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>{t('game:leftPanel.milieus')}</h3>
        <MilieuSidebar />
        <PolitikfeldGrid />
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>{t('game:leftPanel.kabinett')}</h3>
        <div className={styles.kabinett}>
          {chars.slice(0, 6).map((char) => (
            <CharacterRow key={char.id} character={char} />
          ))}
        </div>
        <KoalitionspartnerPanel />
      </section>

      <nav className={styles.ebenen}>
        {EBENEN.map(({ id, label, color }: { id: string; label: string; color: string }) => (
          <button
            key={id}
            type="button"
            className={`${styles.ebeneItem} ${view === id ? styles.active : ''}`}
            onClick={() => setView(id as Parameters<typeof setView>[0])}
          >
            <span
              className={styles.ebeneDot}
              style={{ backgroundColor: color }}
            />
            <span className={styles.ebeneLabel}>{label}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}
