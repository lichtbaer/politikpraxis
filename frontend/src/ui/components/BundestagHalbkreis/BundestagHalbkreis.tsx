/**
 * SMA-344: Halbkreis-SVG — klassische Parlamentsdarstellung (links → rechts).
 */
import { useTranslation } from 'react-i18next';
import { BUNDESTAG_SITZE_GESAMT, type FraktionSitze } from '../../../constants/bundestag';
import styles from './BundestagHalbkreis.module.css';

const CX = 200;
const CY = 210;
const R_OUTER = 175;
const R_INNER = 118;

/** Kreisbogen-Pfad (Ringsegment) von Winkel t1 nach t2 (Radiant, obere Halbebene) */
function wedgePath(t1: number, t2: number): string {
  const x1o = CX + R_OUTER * Math.cos(t1);
  const y1o = CY - R_OUTER * Math.sin(t1);
  const x2o = CX + R_OUTER * Math.cos(t2);
  const y2o = CY - R_OUTER * Math.sin(t2);
  const x1i = CX + R_INNER * Math.cos(t1);
  const y1i = CY - R_INNER * Math.sin(t1);
  const x2i = CX + R_INNER * Math.cos(t2);
  const y2i = CY - R_INNER * Math.sin(t2);
  return `M ${x1o} ${y1o} A ${R_OUTER} ${R_OUTER} 0 0 1 ${x2o} ${y2o} L ${x2i} ${y2i} A ${R_INNER} ${R_INNER} 0 0 0 ${x1i} ${y1i} Z`;
}

interface SegmentProps {
  fraktion: FraktionSitze;
  tStart: number;
  tEnd: number;
}

function HalbkreisSegment({ fraktion, tStart, tEnd }: SegmentProps) {
  return (
    <path
      d={wedgePath(tStart, tEnd)}
      fill={fraktion.farbe}
      stroke="var(--border)"
      strokeWidth={0.5}
      className={fraktion.passiv ? styles.segmentPassiv : undefined}
    />
  );
}

export interface BundestagHalbkreisProps {
  fraktionen: FraktionSitze[];
}

export function BundestagHalbkreis({ fraktionen }: BundestagHalbkreisProps) {
  const { t } = useTranslation('game');
  const total = fraktionen.reduce((s, f) => s + f.sitze, 0) || BUNDESTAG_SITZE_GESAMT;

  let seatCursor = 0;
  const segments: { fraktion: FraktionSitze; tStart: number; tEnd: number }[] = [];

  for (const f of fraktionen) {
    const tStart = Math.PI * (1 - seatCursor / total);
    seatCursor += f.sitze;
    const tEnd = Math.PI * (1 - seatCursor / total);
    segments.push({ fraktion: f, tStart, tEnd });
  }

  return (
    <div className={styles.wrap}>
      <svg
        className={styles.svg}
        viewBox="0 0 400 220"
        xmlns="http://www.w3.org/2000/svg"
        aria-label={t('game:bundestag.halbkreisAria', 'Sitzverteilung Bundestag')}
      >
        <title>{t('game:bundestag.halbkreisTitle', 'Sitzverteilung im Halbkreis')}</title>
        {segments.map((seg) => (
          <HalbkreisSegment
            key={seg.fraktion.id}
            fraktion={seg.fraktion}
            tStart={seg.tStart}
            tEnd={seg.tEnd}
          />
        ))}
        <text x={CX} y={198} textAnchor="middle" className={styles.centerLabel} fontSize={12}>
          {t('game:bundestag.sitzeGesamt', { count: BUNDESTAG_SITZE_GESAMT })}
        </text>
      </svg>

      <div className={styles.legende}>
        {fraktionen.map((f) => (
          <div key={f.id} className={styles.legendeItem}>
            <span className={styles.farbePunkt} style={{ background: f.farbe }} />
            <span className={styles.legendeName}>{f.name}</span>
            <span className={styles.legendeSitze}>
              {t('game:bundestag.legendeSitzeProzent', {
                sitze: f.sitze,
                prozent: f.prozent.toFixed(1),
              })}
            </span>
            {f.passiv && (
              <span className={styles.passivBadge}>{t('game:bundestag.nfKeineKooperation')}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
