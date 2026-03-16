import { useGameStore } from '../../store/gameStore';
import { routeLabel } from '../../core/systems/levels';
import type { RouteType } from '../../core/types';
import styles from './EbeneView.module.css';

interface EbeneViewProps {
  type: 'eu' | 'land' | 'kommune';
}

const DESCRIPTIONS: Record<RouteType, string> = {
  eu: 'Gesetze über die EU-Ebene vorantreiben. Längere Laufzeit, aber umgeht den Bundesrat.',
  land: 'Länder-Pilotprojekte starten. Mittlere Laufzeit und Kosten.',
  kommune: 'Städtebündnisse nutzen. Schnellste Alternative mit geringeren Kosten.',
};

const COLOR_VAR: Record<RouteType, string> = {
  eu: 'var(--eu-c)',
  land: 'var(--land-c)',
  kommune: 'var(--kom-c)',
};

export function EbeneView({ type }: EbeneViewProps) {
  const { state } = useGameStore();
  const activeLaws = state.gesetze.filter(
    (g) => g.status === 'ausweich' && g.route === type
  );
  const color = COLOR_VAR[type];

  return (
    <div className={styles.root}>
      <h1 className={styles.title} style={{ color }}>
        {routeLabel(type)}
      </h1>
      <p className={styles.desc}>{DESCRIPTIONS[type]}</p>
      <div className={styles.list}>
        {activeLaws.length === 0 ? (
          <p className={styles.empty}>Keine Gesetze auf dieser Route.</p>
        ) : (
          activeLaws.map((law) => (
            <div key={law.id} className={styles.lawCard}>
              <div className={styles.lawHeader}>
                <span className={styles.lawTitle}>{law.kurz}</span>
                <span className={styles.lawProgress}>
                  {law.rprog}/{law.rdur} Monate
                </span>
              </div>
              <div className={styles.progressTrack}>
                <div
                  className={styles.progressFill}
                  style={{
                    width: `${(law.rprog / law.rdur) * 100}%`,
                    backgroundColor: color,
                  }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
