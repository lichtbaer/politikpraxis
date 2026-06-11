/**
 * SMA-320: 10 Tabs — Quelle der Wahrheit für View → Mindest-Komplexitätsstufe.
 * Eigene Datei (statt EbenenTabBar.tsx), damit auch Nicht-Komponenten
 * (CenterPanel-Redirects) importieren können — react-refresh-konform.
 */
import type { ViewName } from '../../../core/types';

export const TABS: Array<{ id: ViewName; labelKey: string; icon: string; minLevel: number }> = [
  { id: 'agenda', labelKey: 'game:tabBar.agenda', icon: '📋', minLevel: 1 },
  { id: 'bundestag', labelKey: 'game:tabBar.bundestag', icon: '🏛', minLevel: 1 },
  { id: 'kabinett', labelKey: 'game:tabBar.kabinett', icon: '👥', minLevel: 1 },
  { id: 'haushalt', labelKey: 'game:tabBar.haushalt', icon: '💰', minLevel: 2 },
  { id: 'medien', labelKey: 'game:tabBar.medien', icon: '📰', minLevel: 2 },
  { id: 'verbaende', labelKey: 'game:tabBar.verbaende', icon: '🤝', minLevel: 2 },
  { id: 'bundesrat', labelKey: 'game:tabBar.bundesrat', icon: '⚖️', minLevel: 2 },
  { id: 'laender', labelKey: 'game:tabBar.laender', icon: '🗺', minLevel: 3 },
  { id: 'kommunen', labelKey: 'game:tabBar.kommunen', icon: '🏘', minLevel: 3 },
  { id: 'eu', labelKey: 'game:tabBar.eu', icon: '🇪🇺', minLevel: 3 },
];

/** Mindest-Komplexitätsstufe einer View (Quelle: TABS) — auch für Redirect-Hinweise */
export function getViewMinLevel(view: ViewName): number {
  return TABS.find((tab) => tab.id === view)?.minLevel ?? 1;
}
