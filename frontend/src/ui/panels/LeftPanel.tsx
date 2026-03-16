import { useGameStore } from '../../store/gameStore';
import { featureActive } from '../../core/systems/features';
import { CharacterRow } from '../components/CharacterRow/CharacterRow';
import { CoalitionMeter } from '../components/CoalitionMeter/CoalitionMeter';
import { MilieuBar } from '../components/MilieuBar/MilieuBar';
import styles from './LeftPanel.module.css';

const ALL_EBENEN: { id: string; label: string; color: string }[] = [
  { id: 'agenda', label: 'Agenda', color: 'var(--gold)' },
  { id: 'eu', label: 'EU-Ebene', color: 'var(--eu-c)' },
  { id: 'land', label: 'Länderebene', color: 'var(--land-c)' },
  { id: 'kommune', label: 'Kommunen', color: 'var(--kom-c)' },
  { id: 'medien', label: 'Medien & Milieus', color: 'var(--blue)' },
  { id: 'bundesrat', label: 'Bundesrat', color: 'var(--warn)' },
];

export function LeftPanel() {
  const zustG = useGameStore((s) => s.state.zust.g);
  const coalition = useGameStore((s) => s.state.coalition);
  const zustArbeit = useGameStore((s) => s.state.zust.arbeit);
  const zustMitte = useGameStore((s) => s.state.zust.mitte);
  const zustProg = useGameStore((s) => s.state.zust.prog);
  const chars = useGameStore((s) => s.state.chars);
  const view = useGameStore((s) => s.state.view);
  const setView = useGameStore((s) => s.setView);
  const complexity = useGameStore((s) => s.complexity);

  const EBENEN = ALL_EBENEN.filter(
    (e) => e.id !== 'bundesrat' || featureActive(complexity, 'bundesrat_simple'),
  );

  return (
    <aside className={styles.panel}>
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Wahlprognose</h3>
        <div className={styles.wahlprognose}>
          <span className={styles.wahlprognoseValue}>{Math.round(zustG)}%</span>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${Math.min(100, zustG)}%` }}
            />
          </div>
          <span className={styles.target}>Ziel: ≥ 40% am Wahltag</span>
        </div>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Koalitionsstabilität</h3>
        <CoalitionMeter value={coalition} />
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Milieus</h3>
        <div className={styles.milieus}>
          <MilieuBar name="Arbeit" value={zustArbeit} color="var(--land-c)" />
          <MilieuBar name="Mitte" value={zustMitte} color="var(--eu-c)" />
          <MilieuBar name="Progressiv" value={zustProg} color="var(--blue)" />
        </div>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Kabinett</h3>
        <div className={styles.kabinett}>
          {chars.slice(0, 6).map((char) => (
            <CharacterRow key={char.id} character={char} />
          ))}
        </div>
      </section>

      <nav className={styles.ebenen}>
        {EBENEN.map(({ id, label, color }) => (
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
