/**
 * Brücke zwischen den CSS-Design-Tokens und ECharts.
 *
 * Charts rendern in ein `<canvas>` und sehen keine CSS-Variablen: `ctx.font` mit
 * `var(--sans)` ist ungültig und fällt still auf die Browser-Standardschrift zurück,
 * `areaColor: 'var(--bg3)'` bleibt schlicht wirkungslos. Deshalb wurde bisher ein
 * einziges ECharts-Theme mit fest verdrahteten Amtsstube-Farben registriert — beim
 * Wechsel auf „Redaktion" oder „Lageraum" behielten alle Diagramme ihre warmen
 * Brauntöne, während die restliche Oberfläche umschaltete.
 *
 * Hier werden die Token einmal pro Theme aus dem echten Stylesheet ausgelesen und
 * als aufgelöste Farb-/Font-Strings an ECharts weitergereicht.
 */
import { echarts } from './echarts';

export interface ChartTokens {
  bg: string;
  bg2: string;
  bg3: string;
  bg4: string;
  border: string;
  border2: string;
  text: string;
  text2: string;
  text3: string;
  gold: string;
  red: string;
  green: string;
  blue: string;
  warn: string;
  sans: string;
  mono: string;
}

const TOKEN_NAMES: Array<keyof ChartTokens> = [
  'bg', 'bg2', 'bg3', 'bg4', 'border', 'border2',
  'text', 'text2', 'text3', 'gold', 'red', 'green', 'blue', 'warn',
  'sans', 'mono',
];

/**
 * Amtsstube-Werte als Rückfallebene. Greift in jsdom (Unit-Tests), wo
 * `getComputedStyle` keine Custom Properties auflöst, und bevor das Stylesheet da ist.
 */
const FALLBACK: ChartTokens = {
  bg: '#1c1a15',
  bg2: '#222019',
  bg3: '#2b2820',
  bg4: '#333027',
  border: '#3a3630',
  border2: '#4c4840',
  text: '#e6deca',
  text2: '#b6afa3',
  text3: '#9a978f',
  gold: '#c8a84a',
  red: '#cc786b',
  green: '#5f9b74',
  blue: '#6793be',
  warn: '#ca7c40',
  sans: "'DM Sans', system-ui, sans-serif",
  mono: "'DM Mono', monospace",
};

/**
 * Liest die Token eines Themes aus dem Stylesheet.
 *
 * Über ein temporäres Element mit `data-theme`, nicht über `document.documentElement`:
 * so ist das Ergebnis unabhängig davon, ob das Attribut am Wurzelelement zum
 * Aufrufzeitpunkt schon gesetzt ist (App setzt es in einem Effekt, Charts rendern
 * davor).
 */
export function readChartTokens(theme: string): ChartTokens {
  if (typeof document === 'undefined') return FALLBACK;

  const probe = document.createElement('div');
  probe.setAttribute('data-theme', theme);
  probe.style.display = 'none';
  document.body.appendChild(probe);
  try {
    const computed = getComputedStyle(probe);
    const tokens = { ...FALLBACK };
    for (const name of TOKEN_NAMES) {
      const value = computed.getPropertyValue(`--${name}`).trim();
      if (value) tokens[name] = value;
    }
    return tokens;
  } finally {
    probe.remove();
  }
}

/**
 * Token-Farbe mit Deckkraft — für Flächenverläufe unter Linien.
 *
 * Canvas kennt kein `color-mix()`; Token-Werte sind `#rrggbb`, die hier in `rgba()`
 * umgeschrieben werden. Nicht-Hex-Werte werden unverändert durchgereicht.
 */
export function withAlpha(color: string, alpha: number): string {
  const hex = /^#([0-9a-f]{6})$/i.exec(color.trim());
  if (!hex) return color;
  const n = parseInt(hex[1], 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/**
 * Mischt zwei Token-Farben (`amount` = Anteil von `a`) — das Canvas-Pendant zu
 * `color-mix()`. Für abgestufte Flächenfarben, etwa hervorgehobene Kartenregionen.
 */
export function mix(a: string, b: string, amount: number): string {
  const pa = /^#([0-9a-f]{6})$/i.exec(a.trim());
  const pb = /^#([0-9a-f]{6})$/i.exec(b.trim());
  if (!pa || !pb) return a;
  const na = parseInt(pa[1], 16);
  const nb = parseInt(pb[1], 16);
  const ch = (shift: number) =>
    Math.round((((na >> shift) & 255) * amount + ((nb >> shift) & 255) * (1 - amount)));
  return `#${[ch(16), ch(8), ch(0)].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

/** Diagrammfarben in Reihenfolge — semantisch zuerst, danach neutrale Töne. */
export function chartPalette(t: ChartTokens): string[] {
  return [t.green, t.red, t.gold, t.blue, t.warn, t.text2];
}

function buildTheme(t: ChartTokens) {
  const axis = {
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { color: t.text2, fontSize: 9, fontFamily: t.sans },
  };
  return {
    backgroundColor: 'transparent',
    textStyle: { fontFamily: t.sans, fontSize: 11, color: t.text },
    color: chartPalette(t),
    line: { smooth: true, symbol: 'none', lineStyle: { width: 2 } },
    bar: { itemStyle: { borderRadius: [2, 2, 0, 0] } },
    categoryAxis: { ...axis, splitLine: { show: false } },
    valueAxis: {
      ...axis,
      splitLine: { lineStyle: { color: t.border, type: 'dashed' } },
    },
    tooltip: {
      backgroundColor: t.bg2,
      borderColor: t.border2,
      borderWidth: 1,
      textStyle: { color: t.text, fontSize: 11, fontFamily: t.sans },
      extraCssText: 'border-radius:4px;padding:6px 10px;box-shadow:0 4px 16px rgba(0,0,0,0.45);',
    },
  };
}

const registered = new Map<string, ChartTokens>();

/**
 * Registriert das ECharts-Theme für `theme` (idempotent) und gibt seinen Namen zurück.
 * Der Name wird an `<ReactEChartsCore theme={...}>` durchgereicht.
 */
export function ensureChartTheme(theme: string): string {
  const id = `pp-${theme}`;
  if (!registered.has(id)) {
    const tokens = readChartTokens(theme);
    registered.set(id, tokens);
    // Unit-Tests ersetzen das echarts-Modul durch einen Stub — dann gibt es nur
    // die Token, keine Registrierung.
    if (typeof echarts.registerTheme === 'function') {
      echarts.registerTheme(id, buildTheme(tokens));
    }
  }
  return id;
}

/** Die aufgelösten Token eines Themes — für Farbwerte, die direkt in Chart-Optionen stehen. */
export function chartTokens(theme: string): ChartTokens {
  ensureChartTheme(theme);
  return registered.get(`pp-${theme}`) ?? FALLBACK;
}
