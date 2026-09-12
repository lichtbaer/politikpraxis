/**
 * Erzeugt aus den GeoJSON-Dateien die statische Hintergrundkarte des Hauptmenues
 * als vereinfachtes Inline-SVG (src/ui/components/StartMapView/startMapPaths.ts).
 *
 * Warum vorab statt zur Laufzeit: Die Karte ist dekorativ (`aria-hidden`), nicht
 * interaktiv und statisch. Zur Laufzeit kostete sie 228 KB ECharts + 199 KB GeoJSON
 * auf der Startseite — fuer eine Silhouette, die grossteils ausserhalb des Bildes liegt.
 *
 * Aufruf:  node scripts/generateStartMap.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';

const EUROPE = 'public/geo/europe.geojson';
const GERMANY = 'public/geo/germany-bundeslaender.geojson';
const OUT = 'src/ui/components/StartMapView/startMapPaths.ts';

/** Sichtbarer Ausschnitt in Grad — entspricht dem bisherigen ECharts-Zoom. */
const VIEW = { lonMin: -12, lonMax: 34, latMin: 35, latMax: 62 };
/** ECharts-Standard: x wird gestaucht, damit Europa nicht in die Breite laeuft. */
const ASPECT_SCALE = 0.75;
/** Vereinfachungstoleranz in Grad (Douglas-Peucker). */
const TOLERANCE_EUROPE = 0.16;
const TOLERANCE_GERMANY = 0.035;
/** Ringe unterhalb dieser Flaeche (Grad²) fliegen raus — Inseln, Splitter. */
const MIN_AREA_EUROPE = 0.9;
const MIN_AREA_GERMANY = 0.02;

const WIDTH = 1000;

function project([lon, lat]) {
  return [lon * ASPECT_SCALE, -lat];
}

const bounds = (() => {
  const [x0, y0] = project([VIEW.lonMin, VIEW.latMax]);
  const [x1, y1] = project([VIEW.lonMax, VIEW.latMin]);
  return { x0, y0, w: x1 - x0, h: y1 - y0 };
})();
const HEIGHT = Math.round((bounds.h / bounds.w) * WIDTH);

function toCanvas([lon, lat]) {
  const [x, y] = project([lon, lat]);
  return [((x - bounds.x0) / bounds.w) * WIDTH, ((y - bounds.y0) / bounds.h) * HEIGHT];
}

/** Douglas-Peucker auf Rohkoordinaten (Grad). */
function simplify(points, tolerance) {
  if (points.length <= 3) return points;
  const sqTol = tolerance * tolerance;

  const sqSegDist = (p, a, b) => {
    let [x, y] = a;
    let dx = b[0] - x;
    let dy = b[1] - y;
    if (dx !== 0 || dy !== 0) {
      const t = ((p[0] - x) * dx + (p[1] - y) * dy) / (dx * dx + dy * dy);
      if (t > 1) [x, y] = b;
      else if (t > 0) {
        x += dx * t;
        y += dy * t;
      }
    }
    dx = p[0] - x;
    dy = p[1] - y;
    return dx * dx + dy * dy;
  };

  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [first, last] = stack.pop();
    let index = -1;
    let maxSq = sqTol;
    for (let i = first + 1; i < last; i++) {
      const sq = sqSegDist(points[i], points[first], points[last]);
      if (sq > maxSq) {
        index = i;
        maxSq = sq;
      }
    }
    if (index !== -1) {
      keep[index] = 1;
      stack.push([first, index], [index, last]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

/** Shoelace-Flaeche in Grad² (Betrag). */
function ringArea(points) {
  let sum = 0;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    sum += (points[j][0] + points[i][0]) * (points[j][1] - points[i][1]);
  }
  return Math.abs(sum / 2);
}

function ringsOf(geometry) {
  if (geometry.type === 'Polygon') return geometry.coordinates;
  if (geometry.type === 'MultiPolygon') return geometry.coordinates.flat();
  return [];
}

function ringToPath(ring) {
  const d = ring
    .map(toCanvas)
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`)
    .join('');
  return `${d}Z`;
}

/** Liegt der Ring ueberhaupt im sichtbaren Ausschnitt? */
function intersectsView(ring) {
  return ring.some(
    ([lon, lat]) =>
      lon > VIEW.lonMin - 4 &&
      lon < VIEW.lonMax + 4 &&
      lat > VIEW.latMin - 3 &&
      lat < VIEW.latMax + 3,
  );
}

function buildPath(geojsonPath, { tolerance, minArea, exclude = () => false }) {
  const geo = JSON.parse(readFileSync(geojsonPath, 'utf8'));
  const parts = [];
  for (const feature of geo.features) {
    if (exclude(feature)) continue;
    for (const ring of ringsOf(feature.geometry)) {
      if (!intersectsView(ring)) continue;
      if (ringArea(ring) < minArea) continue;
      const simplified = simplify(ring, tolerance);
      if (simplified.length < 4) continue;
      parts.push(ringToPath(simplified));
    }
  }
  return parts.join('');
}

// Deutschland kommt aus der Bundeslaender-Datei — in der Europa-Ebene weglassen,
// damit sich die Umrisse nicht doppeln.
const europe = buildPath(EUROPE, {
  tolerance: TOLERANCE_EUROPE,
  minArea: MIN_AREA_EUROPE,
  exclude: (f) => f.properties?.iso2 === 'DE',
});
const germany = buildPath(GERMANY, {
  tolerance: TOLERANCE_GERMANY,
  minArea: MIN_AREA_GERMANY,
});

const file = `/* eslint-disable */
/**
 * GENERIERT — nicht von Hand bearbeiten.
 * Quelle: public/geo/*.geojson · Generator: scripts/generateStartMap.mjs
 *
 * Vereinfachte Silhouetten fuer die dekorative Startkarte. Ersetzt die frueher
 * zur Laufzeit geladene ECharts-Karte (228 KB Bibliothek + 199 KB GeoJSON).
 */
export const START_MAP_VIEWBOX = '0 0 ${WIDTH} ${HEIGHT}';

/** Europa ohne Deutschland (liegt als eigene Ebene darueber). */
export const EUROPE_PATH =
  '${europe}';

/** Deutschland, aus den Bundeslaender-Umrissen. */
export const GERMANY_PATH =
  '${germany}';
`;

writeFileSync(OUT, file);
console.log(
  `${OUT}: viewBox 0 0 ${WIDTH} ${HEIGHT}, Europa ${(europe.length / 1024).toFixed(1)} KB, ` +
    `Deutschland ${(germany.length / 1024).toFixed(1)} KB`,
);
