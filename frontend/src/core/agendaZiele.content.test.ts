/**
 * #475: Konsistenz der Agenda- und Koalitionsziele im echten Content (DB-Snapshot).
 *
 * - Jedes Ziel ist auf seiner `min_complexity` auswertbar: Milieuziele brauchen Milieu-Werte
 *   (`milieus_voll`) und das Milieu selbst; Verbandsziele einen Hebel (Verbandsgespräch).
 * - Kein Ziel, das man über die Legislatur erarbeiten soll, ist schon zum Start erfüllt.
 */
import { describe, expect, it, vi } from 'vitest';
import { echterContent } from './simulation/echterContent';
import { createInitialState } from './state';
import { buildAgendaSidebarRows } from './agendaTracking';
import { featureActive } from './systems/features';
import { pickInitialKoalitionsAgenda, waehlbareSpielerAgendaZiele } from './onboardingAgenda';
import { SPIELBARE_PARTEIEN } from '../data/defaults/parteien';
import type { GameState } from './types';

const content = echterContent();
const alleZiele = [...(content.agendaZiele ?? []), ...(content.koalitionsZiele ?? [])];

/**
 * Zum Start erfüllt sein dürfen nur Ziele, die im Spiel unter Druck geraten:
 * - Zähler „höchstens N Monate …“ (per Definition bei 0 erfüllt),
 * - Kabinettsstimmung: jedes beschlossene Gesetz kostet Stimmung — gesetzgebende Strategien
 *   enden im Median bei Ø 1,2–2,6, Zufallsspiel hält ≥ 3,0 nur in 21–52 % (Sim, N=25).
 */
const ZUM_START_ERFUELLT_ERLAUBT = new Set([
  'medienklima_monate_max_unter',
  'char_mood_schlecht_max',
  'char_mood_min_durchschnitt',
]);

function startStates(): GameState[] {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  const states: GameState[] = [];
  for (const partei of SPIELBARE_PARTEIEN) {
    const parteiState = { id: partei.id, kuerzel: partei.kuerzel, farbe: partei.farbe, name: partei.name };
    for (const k of [1, 2, 3, 4]) {
      for (const ausrichtung of [
        { wirtschaft: -40, gesellschaft: -40, staat: -20 },
        { wirtschaft: 0, gesellschaft: 0, staat: 0 },
        { wirtschaft: 40, gesellschaft: 30, staat: 20 },
      ]) {
        states.push(createInitialState(content, k, ausrichtung, parteiState));
      }
    }
  }
  warn.mockRestore();
  return states;
}

describe('Agenda-Ziele im echten Content (#475)', () => {
  it('jedes Ziel hat einen ausgewerteten Bedingungstyp', () => {
    const state = { ...createInitialState(content, 4), spielerAgenda: [], koalitionsAgenda: [] };
    for (const z of alleZiele) {
      const quelle = 'partner_profil' in z ? 'koalitionsAgenda' : 'spielerAgenda';
      const [row] = buildAgendaSidebarRows({ ...state, [quelle]: [z.id] }, content);
      expect(row?.subtitle.key, z.id).not.toBe('game:leftPanel.agendaSubtitle.unbekannt');
    }
  });

  it('Milieu- und Verbandsziele sind auf ihrer Mindeststufe auswertbar', () => {
    const milieuStufe = new Map((content.milieus ?? []).map((m) => [m.id, m.min_complexity ?? 1]));
    for (const z of alleZiele) {
      const p = z.bedingung_param;
      if (z.bedingung_typ.startsWith('milieu_')) {
        expect(featureActive(z.min_complexity, 'milieus_voll'), `${z.id}: Milieus erst ab Stufe 2`).toBe(true);
        const ab = milieuStufe.get(String(p.milieu_id));
        expect(ab, `${z.id}: unbekanntes Milieu ${String(p.milieu_id)}`).toBeDefined();
        expect(ab!, `${z.id}: Milieu ${String(p.milieu_id)} erst ab Stufe ${ab}`).toBeLessThanOrEqual(z.min_complexity);
      }
      if (z.bedingung_typ.startsWith('verband_')) {
        expect(
          featureActive(z.min_complexity, 'verbands_lobbying'),
          `${z.id}: ohne Verbandsgespräch kein Hebel auf Stufe ${z.min_complexity}`,
        ).toBe(true);
      }
    }
  });

  it('Stufe 1 bietet jeder Partei mehr Ziele als Plätze (eine echte Wahl)', () => {
    for (const partei of SPIELBARE_PARTEIEN) {
      expect(waehlbareSpielerAgendaZiele(content, 1, partei.id).length, partei.id).toBeGreaterThan(2);
    }
  });

  it('kein Ziel ist zum Spielstart schon erfüllt (alle Parteien, Stufen, Ausrichtungen, Partner)', () => {
    const verstoesse = new Set<string>();
    for (const state of startStates()) {
      const k = state.complexity ?? 4;
      const spieler = waehlbareSpielerAgendaZiele(content, k, state.spielerPartei?.id)
        .filter((z) => !ZUM_START_ERFUELLT_ERLAUBT.has(z.bedingung_typ))
        .map((z) => z.id);
      const koalition = (content.koalitionsZiele ?? [])
        .filter((z) => z.partner_profil === state.koalitionspartner?.id && z.min_complexity <= k)
        .filter((z) => !ZUM_START_ERFUELLT_ERLAUBT.has(z.bedingung_typ))
        .map((z) => z.id);
      const rows = buildAgendaSidebarRows({ ...state, spielerAgenda: spieler, koalitionsAgenda: koalition }, content);
      for (const r of rows.filter((r) => r.erfuellt)) {
        verstoesse.add(`${r.id} (Stufe ${k}, ${state.spielerPartei?.id}, Partner ${state.koalitionspartner?.id ?? '–'})`);
      }
    }
    expect([...verstoesse]).toEqual([]);
  });

  it('die Koalitionsagenda auf Stufe 2 ist ein Gesetzesziel', () => {
    for (const state of startStates().filter((s) => s.complexity === 2 && s.koalitionspartner)) {
      for (const id of pickInitialKoalitionsAgenda(state, content, 2)) {
        const z = content.koalitionsZiele?.find((x) => x.id === id);
        expect(z?.bedingung_typ, id).toMatch(/^gesetz_/);
      }
    }
  });
});
