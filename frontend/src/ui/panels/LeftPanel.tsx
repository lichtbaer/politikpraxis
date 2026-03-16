import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../store/gameStore';
import { featureActive } from '../../core/systems/features';
import { CharacterRow } from '../components/CharacterRow/CharacterRow';
import { CoalitionMeter } from '../components/CoalitionMeter/CoalitionMeter';
import { MilieuBar } from '../components/MilieuBar/MilieuBar';
import styles from './LeftPanel.module.css';

const EBENE_IDS = ['agenda', 'eu', 'land', 'kommune', 'medien', 'bundesrat'] as const;
const EBENE_COLORS: Record<string, string> = {
  agenda: 'var(--gold)',
  eu: 'var(--eu-c)',
  land: 'var(--land-c)',
  kommune: 'var(--kom-c)',
  medien: 'var(--blue)',
  bundesrat: 'var(--warn)',
};

export function LeftPanel() {
  const { t } = useTranslation(['common', 'game']);
  const zustG = useGameStore((s) => s.state.zust.g);
  const coalition = useGameStore((s) => s.state.coalition);
  const zustArbeit = useGameStore((s) => s.state.zust.arbeit);
  const zustMitte = useGameStore((s) => s.state.zust.mitte);
  const zustProg = useGameStore((s) => s.state.zust.prog);
  const chars = useGameStore((s) => s.state.chars);
  const view = useGameStore((s) => s.state.view);
  const setView = useGameStore((s) => s.setView);
  const complexity = useGameStore((s) => s.complexity);

  const EBENEN = EBENE_IDS.filter(
    (id) => id !== 'bundesrat' || featureActive(complexity, 'bundesrat_simple'),
  ).map((id) => ({ id, label: t(`game.ebenen.${id}`, { ns: 'common' }), color: EBENE_COLORS[id] }));

  return (
    <aside className={styles.panel}>
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>{t('game:leftPanel.wahlprognose')}</h3>
        <div className={styles.wahlprognose}>
          <span className={styles.wahlprognoseValue}>{Math.round(zustG)}%</span>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${Math.min(100, zustG)}%` }}
            />
          </div>
          <span className={styles.target}>{t('game:leftPanel.target')}</span>
        </div>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>{t('game:leftPanel.koalitionsstabilitaet')}</h3>
        <CoalitionMeter value={coalition} />
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>{t('game:leftPanel.milieus')}</h3>
        <div className={styles.milieus}>
          <MilieuBar name={t('game:milieu.arbeit')} value={zustArbeit} color="var(--land-c)" />
          <MilieuBar name={t('game:milieu.mitte')} value={zustMitte} color="var(--eu-c)" />
          <MilieuBar name={t('game:milieu.prog')} value={zustProg} color="var(--blue)" />
        </div>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>{t('game:leftPanel.kabinett')}</h3>
        <div className={styles.kabinett}>
          {chars.slice(0, 6).map((char) => (
            <CharacterRow key={char.id} character={char} />
          ))}
        </div>
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
