/**
 * Echter Spiel-Content für die Balance-Simulation.
 *
 * `content-snapshot.json` enthält die Rohantworten der Content-API, exportiert aus einer
 * frisch migrierten DB (`backend/scripts/export_content_snapshot.py`; die CI prüft mit
 * `--check`, dass der Snapshot zu den Migrationen passt). Hier laufen sie durch dieselbe
 * Umwandlung wie im Spiel (`contentDatenAusApi` → `bundleAusContentDaten`), damit die
 * Simulation genau den Content sieht, den Spieler bekommen — 115 Gesetze statt der
 * 19 des handgepflegten `testContent.ts`.
 *
 * Bewusste Ausnahme von der Schichtung core → store: Das ist Werkzeug-Code für
 * Simulation/Report, das Spiel selbst importiert dieses Modul nicht.
 */
import type { ContentBundle } from '../types';
import {
  INITIAL_CONTENT_DATEN,
  bundleAusContentDaten,
  contentDatenAusApi,
  type ContentApiAntworten,
} from '../../store/contentStore';
import snapshot from './content-snapshot.json';

let cache: ContentBundle | null = null;

/** ContentBundle aus dem DB-Snapshot — wie das Spiel es nach `contentStore.load` hat. */
export function echterContent(): ContentBundle {
  cache ??= bundleAusContentDaten({
    ...INITIAL_CONTENT_DATEN,
    ...contentDatenAusApi(snapshot as unknown as ContentApiAntworten),
  });
  return cache;
}
