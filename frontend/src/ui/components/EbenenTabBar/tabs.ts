/**
 * SMA-320: 10 Tabs — Quelle der Wahrheit für View → Mindest-Komplexitätsstufe.
 * Eigene Datei (statt EbenenTabBar.tsx), damit auch Nicht-Komponenten
 * (CenterPanel-Redirects) importieren können — react-refresh-konform.
 */
import type { ComponentType } from 'react';
import type { LucideProps } from 'lucide-react';
import type { ViewName } from '../../../core/types';
import {
  ClipboardList, Landmark, Users, Coins, Newspaper, Handshake, Scale, Map, Building2, Globe,
} from '../../icons';

/**
 * Icons als Lucide-Komponenten, nicht als Emoji: Emoji nehmen die Theme-Farbe nicht
 * an, sitzen auf abweichender Grundlinie und rendern je nach Plattform anders —
 * das EU-Flaggen-Emoji erschien als vollfarbige Flagge zwischen monochromen
 * Piktogrammen.
 */
export const TABS: Array<{
  id: ViewName;
  labelKey: string;
  Icon: ComponentType<LucideProps>;
  minLevel: number;
}> = [
  { id: 'agenda', labelKey: 'game:tabBar.agenda', Icon: ClipboardList, minLevel: 1 },
  { id: 'bundestag', labelKey: 'game:tabBar.bundestag', Icon: Landmark, minLevel: 1 },
  { id: 'kabinett', labelKey: 'game:tabBar.kabinett', Icon: Users, minLevel: 1 },
  { id: 'haushalt', labelKey: 'game:tabBar.haushalt', Icon: Coins, minLevel: 2 },
  { id: 'medien', labelKey: 'game:tabBar.medien', Icon: Newspaper, minLevel: 2 },
  { id: 'verbaende', labelKey: 'game:tabBar.verbaende', Icon: Handshake, minLevel: 2 },
  { id: 'bundesrat', labelKey: 'game:tabBar.bundesrat', Icon: Scale, minLevel: 2 },
  { id: 'laender', labelKey: 'game:tabBar.laender', Icon: Map, minLevel: 3 },
  { id: 'kommunen', labelKey: 'game:tabBar.kommunen', Icon: Building2, minLevel: 3 },
  { id: 'eu', labelKey: 'game:tabBar.eu', Icon: Globe, minLevel: 3 },
];

/** Mindest-Komplexitätsstufe einer View (Quelle: TABS) — auch für Redirect-Hinweise */
export function getViewMinLevel(view: ViewName): number {
  return TABS.find((tab) => tab.id === view)?.minLevel ?? 1;
}
