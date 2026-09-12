/**
 * Dekorative Hintergrundkarte des Hauptmenues.
 *
 * Frueher eine ECharts-Geo-Karte, die zur Laufzeit zwei GeoJSON-Dateien nachlud.
 * Das kostete auf der Startseite 228 KB ECharts (per `modulepreload` noch vor jeder
 * Interaktion) plus 199 KB GeoJSON — fuer eine Grafik, die `aria-hidden`, statisch
 * und nicht interaktiv ist. Jetzt ein vorgerendertes, vereinfachtes Inline-SVG:
 * kein zusaetzlicher Request, kein Nachlade-Flackern, und die Farben kommen aus
 * den Theme-Tokens statt aus fest verdrahteten Hex-Werten.
 *
 * Die Pfade erzeugt `scripts/generateStartMap.mjs` aus `public/geo/*.geojson`.
 */
import { START_MAP_VIEWBOX, EUROPE_PATH, GERMANY_PATH } from './startMapPaths';
import styles from './StartMapView.module.css';

export function StartMapView() {
  return (
    <div className={styles.mapWrap} aria-hidden="true">
      <svg
        className={styles.svg}
        viewBox={START_MAP_VIEWBOX}
        preserveAspectRatio="xMidYMid meet"
        focusable="false"
      >
        <path className={styles.europe} d={EUROPE_PATH} />
        <path className={styles.germany} d={GERMANY_PATH} />
      </svg>
    </div>
  );
}
