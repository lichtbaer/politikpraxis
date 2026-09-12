/**
 * Kontrast-Gate für die Farb-Token aller Themes (WCAG 2.1).
 *
 * Liest `tokens.css` direkt, damit der Test nicht neben der Quelle herläuft.
 * Regeln und Begründung stehen als Kommentar oben in tokens.css.
 */
/// <reference types="node" />
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Direkt von der Platte lesen: `?raw` liefert unter Vitest einen leeren String
// (CSS-Verarbeitung ist in der Testumgebung abgeschaltet), und `import.meta.url`
// ist in jsdom eine http-URL statt eines Dateipfads.
const CSS = readFileSync(resolve(process.cwd(), 'src/styles/tokens.css'), 'utf8');

type Palette = Record<string, string>;

/** Zerlegt tokens.css in { themeName: { tokenName: hex } }. */
function parseThemes(css: string): Record<string, Palette> {
  const themes: Record<string, Palette> = {};
  // Selektor-Block-Paare; der Default-Block traegt ":root," vor dem Theme-Selektor.
  const blocks = css.matchAll(/([^{}]+)\{([^}]*)\}/g);
  for (const [, selector, body] of blocks) {
    const match = /\[data-theme="([a-z]+)"\]/.exec(selector);
    if (!match) continue;
    const palette: Palette = {};
    for (const [, name, value] of body.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) {
      palette[name] = value.toLowerCase();
    }
    themes[match[1]] = palette;
  }
  return themes;
}

function channel(value: number): number {
  const c = value / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function rgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

function luminance(hex: string): number {
  const [r, g, b] = rgb(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG-Kontrastverhältnis zweier Farben (1:1 … 21:1). */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Grobe Farbdistanz in sRGB — trennt „andere Farbe“ von „gleiche Farbe“. */
function colorDistance(a: string, b: string): number {
  const x = rgb(a);
  const y = rgb(b);
  return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]);
}

const THEMES = parseThemes(CSS);
const NAMES = Object.keys(THEMES);
const ALL_BG = ['bg', 'bg2', 'bg3', 'bg4'] as const;
const PANEL_BG = ['bg', 'bg2', 'bg3'] as const;
const TEXT_TOKENS = ['text', 'text2', 'text3'] as const;
const SEMANTIC_TOKENS = ['gold', 'red', 'green', 'blue', 'warn'] as const;

describe('Design-Token: Kontrast', () => {
  it('findet alle vier Themes', () => {
    expect(NAMES.sort()).toEqual(['amtsstube', 'bruessel', 'lageraum', 'redaktion']);
  });

  describe.each(NAMES)('%s', (name) => {
    const p = THEMES[name];

    it.each(TEXT_TOKENS)('--%s erfüllt AA (4.5:1) auf jedem Hintergrund', (token) => {
      for (const bg of ALL_BG) {
        const ratio = contrastRatio(p[token], p[bg]);
        expect(
          ratio,
          `--${token} (${p[token]}) auf --${bg} (${p[bg]}) = ${ratio.toFixed(2)}:1`,
        ).toBeGreaterThanOrEqual(4.5);
      }
    });

    it.each(SEMANTIC_TOKENS)('--%s ist als Text auf Panelflächen lesbar', (token) => {
      for (const bg of PANEL_BG) {
        const ratio = contrastRatio(p[token], p[bg]);
        expect(
          ratio,
          `--${token} (${p[token]}) auf --${bg} (${p[bg]}) = ${ratio.toFixed(2)}:1`,
        ).toBeGreaterThanOrEqual(4.5);
      }
      // --bg4 traegt vor allem Chips/Badges/Ränder → UI-Schwelle 3:1.
      const onBg4 = contrastRatio(p[token], p.bg4);
      expect(onBg4, `--${token} auf --bg4 = ${onBg4.toFixed(2)}:1`).toBeGreaterThanOrEqual(3);
    });

    it('hält die Text-Stufung text > text2 > text3', () => {
      const r = (t: string) => contrastRatio(p[t], p.bg2);
      expect(r('text')).toBeGreaterThan(r('text2'));
      expect(r('text2')).toBeGreaterThan(r('text3'));
    });

    it('trennt den Markenakzent von den Erfolgs-/Fehlerfarben', () => {
      // Sonst ist ein fallender KPI-Wert farblich nicht von einer Marken-Auszeichnung
      // zu unterscheiden (war in „redaktion“ gold === red, in „lageraum“ gold === green).
      expect(colorDistance(p.gold, p.red), `gold ${p.gold} vs red ${p.red}`).toBeGreaterThanOrEqual(40);
      expect(colorDistance(p.gold, p.green), `gold ${p.gold} vs green ${p.green}`).toBeGreaterThanOrEqual(40);
    });
  });
});
