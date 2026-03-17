import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../store/gameStore';
import { CharacterRow } from '../components/CharacterRow/CharacterRow';
import { CoalitionMeter } from '../components/CoalitionMeter/CoalitionMeter';
import { MilieuSidebar } from '../components/MilieuSidebar/MilieuSidebar';
import { PolitikfeldGrid } from '../components/PolitikfeldGrid/PolitikfeldGrid';
import { KoalitionspartnerPanel } from '../components/KoalitionspartnerPanel/KoalitionspartnerPanel';
import styles from './LeftPanel.module.css';

export function LeftPanel() {
  const { t } = useTranslation('game');
  const zustG = useGameStore((s) => s.state.zust.g);
  const electionThreshold = useGameStore((s) => s.state.electionThreshold ?? 40);
  const coalition = useGameStore((s) => s.state.coalition);
  const chars = useGameStore((s) => s.state.chars);

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
    </aside>
  );
}
