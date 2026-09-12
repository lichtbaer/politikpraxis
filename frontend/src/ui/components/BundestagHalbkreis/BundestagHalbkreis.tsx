/**
 * Sitzverteilung im Bundestag als Plenums-Halbkreis.
 *
 * Vorher drei Ringsegmente (Donut) in Array-Reihenfolge: keine einzelnen Sitze,
 * keine Mehrheitsmarke — also gerade die beiden Dinge nicht, für die man eine
 * Halbkreisdarstellung überhaupt wählt. Jetzt echte Sitzpunkte auf konzentrischen
 * Bögen, links nach rechts in Sitzordnung, mit Marke an der Mehrheitsschwelle.
 */
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { BUNDESTAG_SITZE_GESAMT, type FraktionSitze } from '../../../constants/bundestag';
import { buildSeatLayout, seatRadius } from './seatLayout';
import styles from './BundestagHalbkreis.module.css';

const CX = 200;
const CY = 205;
const LAYOUT = { cx: CX, cy: CY, rInner: 92, rOuter: 178, rows: 11 };

export interface BundestagHalbkreisProps {
  fraktionen: FraktionSitze[];
}

export function BundestagHalbkreis({ fraktionen }: BundestagHalbkreisProps) {
  const { t } = useTranslation('game');
  const total = fraktionen.reduce((s, f) => s + f.sitze, 0) || BUNDESTAG_SITZE_GESAMT;

  /** Ein Punkt pro Sitz, in Sitzordnung der jeweiligen Fraktion zugeordnet. */
  const sitze = useMemo(() => {
    const positions = buildSeatLayout(total, LAYOUT);
    const result: Array<{ x: number; y: number; fraktion: FraktionSitze }> = [];
    let cursor = 0;
    for (const fraktion of fraktionen) {
      for (let i = 0; i < fraktion.sitze && cursor < positions.length; i++, cursor++) {
        result.push({ x: positions[cursor].x, y: positions[cursor].y, fraktion });
      }
    }
    return result;
  }, [fraktionen, total]);

  const r = seatRadius(LAYOUT, total);

  /** Mehrheit liegt bei der Hälfte der Sitze — in der Sitzordnung also genau mittig. */
  const mehrheitSitze = Math.floor(total / 2) + 1;
  const koalitionsSitze = fraktionen
    .filter((f) => f.id === 'koalition')
    .reduce((s, f) => s + f.sitze, 0);

  return (
    <div className={styles.wrap}>
      <svg
        className={styles.svg}
        viewBox="0 0 400 220"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label={t('bundestag.halbkreisAria', 'Sitzverteilung Bundestag')}
      >
        <title>{t('bundestag.halbkreisTitle', 'Sitzverteilung im Halbkreis')}</title>
        {sitze.map((sitz, i) => (
          <circle
            key={i}
            cx={sitz.x}
            cy={sitz.y}
            r={r}
            fill={sitz.fraktion.farbe}
            className={sitz.fraktion.passiv ? styles.sitzPassiv : styles.sitz}
          />
        ))}
        {/* Mehrheitsmarke: senkrecht durch die Mitte des Bogens. */}
        <line
          x1={CX}
          y1={CY - LAYOUT.rOuter - 8}
          x2={CX}
          y2={CY - LAYOUT.rInner + 8}
          className={styles.mehrheitsLinie}
        />
        <text x={CX} y={CY - LAYOUT.rOuter - 12} textAnchor="middle" className={styles.mehrheitsLabel}>
          {t('bundestag.mehrheitBei', { sitze: mehrheitSitze })}
        </text>
        <text x={CX} y={CY - 34} textAnchor="middle" className={styles.centerLabel}>
          {t('bundestag.sitzeGesamt', { count: BUNDESTAG_SITZE_GESAMT })}
        </text>
        <text
          x={CX}
          y={CY - 16}
          textAnchor="middle"
          className={koalitionsSitze >= mehrheitSitze ? styles.statusOk : styles.statusFehlt}
        >
          {t(
            koalitionsSitze >= mehrheitSitze
              ? 'bundestag.koalitionMehrheit'
              : 'bundestag.koalitionKeineMehrheit',
            { sitze: koalitionsSitze },
          )}
        </text>
      </svg>

      <div className={styles.legende}>
        {fraktionen.map((f) => (
          <div key={f.id} className={styles.legendeItem}>
            <span className={styles.farbePunkt} style={{ background: f.farbe }} />
            <span className={styles.legendeName}>{f.name}</span>
            <span className={styles.legendeSitze}>
              {t('bundestag.legendeSitzeProzent', {
                sitze: f.sitze,
                prozent: f.prozent.toFixed(1),
              })}
            </span>
            {f.passiv && (
              <span className={styles.passivBadge}>{t('bundestag.nfKeineKooperation')}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
