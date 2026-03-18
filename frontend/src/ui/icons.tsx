/**
 * Zentrales Icon-Registry — ersetzt Emoji-Zeichen durch Lucide React SVG-Icons.
 * Alle Icons an einer Stelle definiert für Konsistenz und Wiederverwendbarkeit.
 */
import type { LucideProps } from 'lucide-react';
import {
  BarChart3, HardHat, Sprout, Shield, GraduationCap,
  Hospital, Monitor, Wheat, AlertTriangle, Check, X,
  CheckCircle, Megaphone, Newspaper, Briefcase, Landmark,
  Building2, Tv, Coins, TrendingUp, Zap,
  Hourglass, RefreshCw, ArrowRight,
  Circle, CircleAlert, Frown, Meh, Smile, Angry, SmilePlus,
  Users, Lightbulb, Vote,
} from 'lucide-react';
import type { ComponentType } from 'react';

// ── Re-exports (direkte Lucide-Icons für Konsumenten) ──────────────────────────
export {
  BarChart3, HardHat, Sprout, Shield, GraduationCap,
  Hospital, Monitor, Wheat, AlertTriangle, Check, X,
  CheckCircle, Megaphone, Newspaper, Briefcase, Landmark,
  Building2, Tv, Coins, TrendingUp, Zap,
  Hourglass, RefreshCw, ArrowRight,
  Circle, CircleAlert, Frown, Meh, Smile, Angry, SmilePlus,
  Users, Lightbulb, Vote,
};

// ── Politikfeld-Icons ──────────────────────────────────────────────────────────
export const POLITIKFELD_ICONS: Record<string, ComponentType<LucideProps>> = {
  wirtschaft_finanzen: BarChart3,
  arbeit_soziales: HardHat,
  umwelt_energie: Sprout,
  innere_sicherheit: Shield,
  bildung_forschung: GraduationCap,
  gesundheit_pflege: Hospital,
  digital_infrastruktur: Monitor,
  landwirtschaft: Wheat,
  // Kurzformen (EbeneView compatibility)
  umwelt: Sprout,
  wirtschaft: BarChart3,
  arbeit: HardHat,
};

// ── Event-Typ-Icons ────────────────────────────────────────────────────────────
export const EVENT_TYPE_ICONS: Record<string, ComponentType<LucideProps>> = {
  danger: CircleAlert,
  warn: AlertTriangle,
  good: CheckCircle,
  info: Megaphone,
  random: Newspaper,
  char_ultimatum: Briefcase,
  bundesrat: Landmark,
  kommunal_initiative: Building2,
  vorstufe_erfolg: CheckCircle,
  skandal: Newspaper,
  tvDuell: Tv,
  pressemitteilung: Megaphone,
  ministerial: Briefcase,
  kommune: Building2,
  wahlkampf: Vote,
};

/** Rendert ein Event-Icon anhand des String-Keys */
export function EventIcon({ iconKey, size = 16, ...rest }: { iconKey: string; size?: number } & Omit<LucideProps, 'size'>) {
  const Icon = EVENT_TYPE_ICONS[iconKey];
  if (!Icon) return <Newspaper size={size} {...rest} />;
  return <Icon size={size} {...rest} />;
}

// ── Stimmungs-Icons (5-Stufen-Skala) ───────────────────────────────────────────
export const MOOD_ICONS: readonly ComponentType<LucideProps>[] = [
  Angry, Frown, Meh, Smile, SmilePlus,
];

/** Fallback-Icon für Politikfelder */
export const PolitikfeldFallbackIcon = Briefcase;

/** Rendert ein Politikfeld-Icon anhand des String-Keys */
export function PolitikfeldIcon({ feldId, size = 16, ...rest }: { feldId: string; size?: number } & Omit<LucideProps, 'size'>) {
  const Icon = POLITIKFELD_ICONS[feldId] ?? PolitikfeldFallbackIcon;
  return <Icon size={size} {...rest} />;
}
