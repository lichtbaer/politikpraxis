/**
 * Balance-Test-Strategien für Monte-Carlo-Simulation.
 * Port der Python-Strategien aus backend/tests/simulation/strategien.py
 * auf die echte TypeScript-Engine.
 */
import type { GameState, ContentBundle, Law } from '../types';

export type StrategyAction =
  | { typ: 'einbringen'; gesetzId: string }
  | { typ: 'lobbying'; gesetzId: string }
  | { typ: 'pressemitteilung' }
  | { typ: 'koalitionsrunde' }
  | { typ: 'nichts' }
  // Erweiterte Aktionen (SMA-Coverage)
  | { typ: 'fraktionssitzung'; gesetzId: string }
  | { typ: 'medienkampagne'; milieu: 'arbeit' | 'mitte' | 'prog' }
  | { typ: 'kabinettsgespraech'; charId: string }
  | { typ: 'regierungserklaerung' }
  | { typ: 'verbandGespraech'; verbandId: string }
  | { typ: 'wahlkampfRede'; milieuId: string }
  | { typ: 'wahlkampfKoalition' }
  | { typ: 'wahlkampfMedienoffensive' }
  | { typ: 'lobbyFraktion'; fraktionId: string; gesetzId: string }
  | { typ: 'startKommunalPilot'; gesetzId: string; stadttyp: 'progressiv' | 'konservativ' | 'industrie' }
  | { typ: 'laenderGipfel' }
  | { typ: 'prioritaetsgespraech'; gesetzId: string }
  | { typ: 'vermittlungsausschuss'; gesetzId: string };

export type Strategy = (state: GameState, content: ContentBundle, complexity: number) => StrategyAction;

/** Verfügbare Gesetze: Entwurf-Status, nicht event-locked */
function verfuegbareGesetze(state: GameState): Law[] {
  return state.gesetze.filter(
    g => g.status === 'entwurf' && !g.locked_until_event
  );
}

/** Kongruenz-Score Gesetz vs. Partei (vereinfacht) */
function kongruenz(law: Law, partei: 'sdp' | 'cdp'): number {
  const ideo = law.ideologie;
  if (!ideo) return 0;
  const score = ideo.wirtschaft * 0.4 + ideo.gesellschaft * 0.35 + ideo.staat * 0.25;
  return partei === 'sdp' ? score : -score;
}

// =============================================================================
// Basis-Strategien
// =============================================================================

/** Wählt zufällig eine Aktion */
export function strategieRandom(state: GameState): StrategyAction {
  const aktionen = ['nichts', 'einbringen', 'lobbying', 'pressemitteilung'] as const;
  const a = aktionen[Math.floor(Math.random() * aktionen.length)];

  if (a === 'einbringen') {
    const gesetze = verfuegbareGesetze(state);
    if (gesetze.length > 0 && state.pk >= 15) {
      const g = gesetze[Math.floor(Math.random() * gesetze.length)];
      return { typ: 'einbringen', gesetzId: g.id };
    }
    return { typ: 'nichts' };
  }
  if (a === 'lobbying') {
    const eingebrachte = state.gesetze.filter(g => g.status === 'eingebracht' || g.status === 'entwurf');
    if (eingebrachte.length > 0 && state.pk >= 12) {
      return { typ: 'lobbying', gesetzId: eingebrachte[0].id };
    }
    return { typ: 'nichts' };
  }
  if (a === 'pressemitteilung') return { typ: 'pressemitteilung' };
  return { typ: 'nichts' };
}

/** Bringt immer das erste verfügbare Gesetz ein */
export function strategieImmerEinbringen(state: GameState): StrategyAction {
  const gesetze = verfuegbareGesetze(state);
  if (gesetze.length > 0 && state.pk >= 15) {
    return { typ: 'einbringen', gesetzId: gesetze[0].id };
  }
  return { typ: 'nichts' };
}

/** Bringt nur Spargesetze ein (pflichtausgaben_delta < 0) */
export function strategieNurSparen(state: GameState): StrategyAction {
  const spargesetze = verfuegbareGesetze(state).filter(
    g => (g.pflichtausgaben_delta ?? 0) < 0
  );
  if (spargesetze.length > 0 && state.pk >= 15) {
    return { typ: 'einbringen', gesetzId: spargesetze[0].id };
  }
  return { typ: 'nichts' };
}

/** Bringt nur teure Ausgaben-Gesetze ein */
export function strategieNurAusgaben(state: GameState): StrategyAction {
  const ausgaben = verfuegbareGesetze(state)
    .filter(g => (g.kosten_laufend ?? 0) > 2 || (g.effekte.hh ?? 0) < -0.3)
    .sort((a, b) => {
      const scoreA = (a.kosten_laufend ?? 0) * 12 + ((a.effekte.hh ?? 0) * 10);
      const scoreB = (b.kosten_laufend ?? 0) * 12 + ((b.effekte.hh ?? 0) * 10);
      return scoreA - scoreB;
    });
  if (ausgaben.length > 0 && state.pk >= 15) {
    return { typ: 'einbringen', gesetzId: ausgaben[0].id };
  }
  return { typ: 'nichts' };
}

/** Gibt nie PK aus */
export function strategiePkHorten(): StrategyAction {
  return { typ: 'nichts' };
}

/** Ideologisch kongruent für SDP (links) */
export function strategieIdeologischSdp(state: GameState): StrategyAction {
  const gesetze = verfuegbareGesetze(state);
  if (gesetze.length === 0 || state.pk < 15) return { typ: 'nichts' };
  const passend = [...gesetze].sort((a, b) => kongruenz(b, 'sdp') - kongruenz(a, 'sdp'));
  return { typ: 'einbringen', gesetzId: passend[0].id };
}

/** Ideologisch kongruent für CDP (rechts) */
export function strategieIdeologischCdp(state: GameState): StrategyAction {
  const gesetze = verfuegbareGesetze(state);
  if (gesetze.length === 0 || state.pk < 15) return { typ: 'nichts' };
  const passend = [...gesetze].sort((a, b) => kongruenz(b, 'cdp') - kongruenz(a, 'cdp'));
  return { typ: 'einbringen', gesetzId: passend[0].id };
}

// =============================================================================
// Scripted Scenarios (SMA-334)
// =============================================================================

/** Szenario 1: Musterschüler — 1 Gesetz pro Quartal, ideologisch kohärent, pflegt Koalition */
export function strategieMusterschueler(state: GameState): StrategyAction {
  if (state.pk < 15) return { typ: 'nichts' };

  const quartal = Math.floor((state.month - 1) / 3);
  const gesetzeErwartet = quartal + 1;
  const bereitsGebracht = state.gesetze.filter(
    g => g.status !== 'entwurf' || g.locked_until_event
  ).length - (state.gesetze.filter(g => g.locked_until_event).length);

  if (bereitsGebracht < gesetzeErwartet) {
    const gesetze = verfuegbareGesetze(state);
    if (gesetze.length > 0) {
      const passend = [...gesetze].sort((a, b) => kongruenz(b, 'sdp') - kongruenz(a, 'sdp'));
      return { typ: 'einbringen', gesetzId: passend[0].id };
    }
  }

  // Zwischen Gesetzen: abwechselnd Lobbying und Pressemitteilung
  if (state.pk >= 15 && state.coalition < 60) {
    return { typ: 'koalitionsrunde' };
  }
  if (state.pk >= 12 && Math.random() < 0.5) {
    const eingebrachte = state.gesetze.filter(g => g.status === 'eingebracht');
    if (eingebrachte.length > 0) {
      return { typ: 'lobbying', gesetzId: eingebrachte[0].id };
    }
  }
  if (state.pk >= 5) return { typ: 'pressemitteilung' };

  return { typ: 'nichts' };
}

/** Szenario 2: Sparkommissar — nur Spargesetze */
export function strategieSparkommissar(state: GameState): StrategyAction {
  return strategieNurSparen(state);
}

/** Szenario 4: Koalitionsbrecher — Gesetze die dem Partner widersprechen, nie Koalitionsrunde */
export function strategieKoalitionsbrecher(state: GameState): StrategyAction {
  if (state.pk < 15) return { typ: 'nichts' };
  const gesetze = verfuegbareGesetze(state);
  if (gesetze.length === 0) return { typ: 'nichts' };
  // Gesetze mit niedrigster CDP-Kongruenz (widerspricht Partner)
  const widersprechend = [...gesetze].sort((a, b) => kongruenz(a, 'cdp') - kongruenz(b, 'cdp'));
  return { typ: 'einbringen', gesetzId: widersprechend[0].id };
}

/** Szenario 5: Medienmogul — maximiert Lobbying und Pressemitteilungen */
export function strategieMedienmogul(state: GameState): StrategyAction {
  if (state.pk >= 12) {
    const gesetze = state.gesetze.filter(g => g.status === 'eingebracht' || g.status === 'entwurf');
    if (gesetze.length > 0) return { typ: 'lobbying', gesetzId: gesetze[0].id };
  }
  if (state.pk >= 5) return { typ: 'pressemitteilung' };
  return { typ: 'nichts' };
}

/** Szenario 6: Verbands-Freund — Gesetze mit höchstem zf + gi Score */
export function strategieVerbandsFreund(state: GameState): StrategyAction {
  const gesetze = verfuegbareGesetze(state);
  if (gesetze.length === 0 || state.pk < 15) return { typ: 'nichts' };
  const best = [...gesetze].sort((a, b) => {
    const scoreA = (a.effekte.zf ?? 0) + (a.effekte.gi ?? 0) * 0.5;
    const scoreB = (b.effekte.zf ?? 0) + (b.effekte.gi ?? 0) * 0.5;
    return scoreB - scoreA;
  });
  return { typ: 'einbringen', gesetzId: best[0].id };
}

/** Szenario 8: Speed-Runner — so viele Gesetze wie möglich so früh wie möglich */
export function strategieSpeedRunner(state: GameState): StrategyAction {
  const gesetze = verfuegbareGesetze(state);
  if (gesetze.length > 0 && state.pk >= 15) {
    return { typ: 'einbringen', gesetzId: gesetze[0].id };
  }
  return { typ: 'nichts' };
}

// =============================================================================
// Erweiterte Strategien (Balance-Coverage)
// =============================================================================

/** Bundesrat-Profi: Einbringen + aktives Bundesrat-Lobbying + Ländergipfel */
export function strategieBundesratProfi(state: GameState): StrategyAction {
  if (state.pk < 12) return { typ: 'nichts' };

  // Ländergipfel einmal pro Jahr (alle 12 Monate)
  if (state.pk >= 12 && state.month % 12 === 6) {
    return { typ: 'laenderGipfel' };
  }

  // Bundesrat-Lobbying auf eingebrachte Gesetze
  const eingebrachte = state.gesetze.filter(g => g.status === 'eingebracht' || g.status === 'bt_passed');
  if (eingebrachte.length > 0 && state.pk >= 15 && state.bundesratFraktionen?.length) {
    const fraktion = state.bundesratFraktionen[Math.floor(Math.random() * state.bundesratFraktionen.length)];
    return { typ: 'lobbyFraktion', fraktionId: fraktion.id, gesetzId: eingebrachte[0].id };
  }

  // Gesetze einbringen
  const gesetze = verfuegbareGesetze(state);
  if (gesetze.length > 0 && state.pk >= 15) {
    const passend = [...gesetze].sort((a, b) => kongruenz(b, 'sdp') - kongruenz(a, 'sdp'));
    return { typ: 'einbringen', gesetzId: passend[0].id };
  }

  return { typ: 'nichts' };
}

/** Kabinettspfleger: Pflegt Minister-Mood, bringt daneben Gesetze ein */
export function strategieKabinettspfleger(state: GameState): StrategyAction {
  // Minister mit niedriger Stimmung pflegen
  const unzufrieden = state.chars.filter(c => c.mood <= 1 && !c.ist_kanzler);
  if (unzufrieden.length > 0 && state.pk >= 8) {
    return { typ: 'kabinettsgespraech', charId: unzufrieden[0].id };
  }

  // Regierungserklärung alle 12 Monate
  if (state.pk >= 30 && state.month % 12 === 1 && state.month > 1) {
    return { typ: 'regierungserklaerung' };
  }

  // Gesetze einbringen (SDP-kongruent)
  const gesetze = verfuegbareGesetze(state);
  if (gesetze.length > 0 && state.pk >= 15) {
    const passend = [...gesetze].sort((a, b) => kongruenz(b, 'sdp') - kongruenz(a, 'sdp'));
    return { typ: 'einbringen', gesetzId: passend[0].id };
  }

  return { typ: 'nichts' };
}

/** Medienstratege: Medienkampagne + Pressemitteilung + Einbringen */
export function strategieMedienstratege(state: GameState): StrategyAction {
  // Abwechselnd Medienkampagne und Einbringen
  if (state.month % 3 === 0 && state.pk >= 10) {
    // Medienkampagne auf schwächstes Milieu
    const milieus: Array<'arbeit' | 'mitte' | 'prog'> = ['arbeit', 'mitte', 'prog'];
    const schwaechstes = milieus.reduce((best, m) =>
      (state.zust[m] ?? 50) < (state.zust[best] ?? 50) ? m : best, milieus[0]);
    return { typ: 'medienkampagne', milieu: schwaechstes };
  }

  if (state.month % 3 === 1 && state.pk >= 5) {
    return { typ: 'pressemitteilung' };
  }

  // Gesetze einbringen
  const gesetze = verfuegbareGesetze(state);
  if (gesetze.length > 0 && state.pk >= 15) {
    return { typ: 'einbringen', gesetzId: gesetze[0].id };
  }

  return { typ: 'nichts' };
}

/** Kommunalpolitiker: Startet Kommunal-Piloten, bringt dann ein */
export function strategieKommunalpolitiker(state: GameState): StrategyAction {
  if (state.pk < 15) return { typ: 'nichts' };

  // Prüfe ob ein Pilot gestartet werden kann (Gesetz ohne laufende Vorstufe)
  const gesetze = verfuegbareGesetze(state);
  const ohnePilot = gesetze.filter(g => {
    const aktiveVorstufen = state.gesetzProjekte?.[g.id]?.aktiveVorstufen ?? [];
    return !aktiveVorstufen.some(v => !v.abgeschlossen);
  });
  if (ohnePilot.length > 0 && state.month <= 36) {
    const stadttypen: Array<'progressiv' | 'konservativ' | 'industrie'> = ['progressiv', 'konservativ', 'industrie'];
    const typ = stadttypen[Math.floor(Math.random() * stadttypen.length)];
    return { typ: 'startKommunalPilot', gesetzId: ohnePilot[0].id, stadttyp: typ };
  }

  // Gesetze einbringen (auch mit Pilot)
  if (gesetze.length > 0) {
    return { typ: 'einbringen', gesetzId: gesetze[0].id };
  }

  return { typ: 'nichts' };
}

/** Wahlkämpfer: Standard bis Monat 42, dann aggressive Wahlkampf-Aktionen */
export function strategieWahlkaempfer(state: GameState): StrategyAction {
  // Wahlkampf-Phase (ab Monat 43)
  if (state.wahlkampfAktiv) {
    if (state.pk >= 15 && !state.medienoffensiveGenutzt) {
      return { typ: 'wahlkampfMedienoffensive' };
    }
    if (state.pk >= 12) {
      return { typ: 'wahlkampfKoalition' };
    }
    if (state.pk >= 8) {
      const milieus = ['arbeit', 'mitte', 'prog'];
      const milieu = milieus[Math.floor(Math.random() * milieus.length)];
      return { typ: 'wahlkampfRede', milieuId: milieu };
    }
    return { typ: 'nichts' };
  }

  // Normale Phase: Gesetze einbringen
  const gesetze = verfuegbareGesetze(state);
  if (gesetze.length > 0 && state.pk >= 15) {
    const passend = [...gesetze].sort((a, b) => kongruenz(b, 'sdp') - kongruenz(a, 'sdp'));
    return { typ: 'einbringen', gesetzId: passend[0].id };
  }
  return { typ: 'nichts' };
}

/** Koalitionsmanager: Prioritätsgespräche + intensive Koalitionspflege */
export function strategieKoalitionsmanager(state: GameState): StrategyAction {
  // Koalitionsrunde bei niedrigem Koalitionswert
  if (state.coalition < 50 && state.pk >= 15) {
    return { typ: 'koalitionsrunde' };
  }

  // Prioritätsgespräch für eingebrachte Gesetze
  const eingebrachte = state.gesetze.filter(g => g.status === 'eingebracht');
  if (eingebrachte.length > 0 && state.pk >= 20 && state.month % 2 === 0) {
    return { typ: 'prioritaetsgespraech', gesetzId: eingebrachte[0].id };
  }

  // Gesetze einbringen
  const gesetze = verfuegbareGesetze(state);
  if (gesetze.length > 0 && state.pk >= 15) {
    const passend = [...gesetze].sort((a, b) => kongruenz(b, 'sdp') - kongruenz(a, 'sdp'));
    return { typ: 'einbringen', gesetzId: passend[0].id };
  }

  // Koalitionsrunde als Fallback
  if (state.pk >= 15) return { typ: 'koalitionsrunde' };
  return { typ: 'nichts' };
}

/** Allrounder: Rotiert durch alle Systeme basierend auf State */
export function strategieAllrounder(state: GameState): StrategyAction {
  const monatImQuartal = (state.month - 1) % 6;

  // Wahlkampf-Phase
  if (state.wahlkampfAktiv) {
    if (state.pk >= 15 && !state.medienoffensiveGenutzt) return { typ: 'wahlkampfMedienoffensive' };
    if (state.pk >= 8) return { typ: 'wahlkampfRede', milieuId: 'mitte' };
    return { typ: 'nichts' };
  }

  // Rotation durch verschiedene Aktionen
  switch (monatImQuartal) {
    case 0: {
      // Gesetze einbringen
      const gesetze = verfuegbareGesetze(state);
      if (gesetze.length > 0 && state.pk >= 15) {
        const passend = [...gesetze].sort((a, b) => kongruenz(b, 'sdp') - kongruenz(a, 'sdp'));
        return { typ: 'einbringen', gesetzId: passend[0].id };
      }
      break;
    }
    case 1: {
      // Lobbying auf eingebrachte Gesetze
      const eingebrachte = state.gesetze.filter(g => g.status === 'eingebracht');
      if (eingebrachte.length > 0 && state.pk >= 12) {
        return { typ: 'lobbying', gesetzId: eingebrachte[0].id };
      }
      break;
    }
    case 2: {
      // Fraktionssitzung
      const eingebrachteF = state.gesetze.filter(g => g.status === 'eingebracht');
      if (eingebrachteF.length > 0 && state.pk >= 8) {
        return { typ: 'fraktionssitzung', gesetzId: eingebrachteF[0].id };
      }
      break;
    }
    case 3: {
      // Medienkampagne
      if (state.pk >= 10) {
        const milieus: Array<'arbeit' | 'mitte' | 'prog'> = ['arbeit', 'mitte', 'prog'];
        const schwaechstes = milieus.reduce((best, m) =>
          (state.zust[m] ?? 50) < (state.zust[best] ?? 50) ? m : best, milieus[0]);
        return { typ: 'medienkampagne', milieu: schwaechstes };
      }
      break;
    }
    case 4: {
      // Kabinettsgespräch mit unzufriedenstem Minister
      const unzufrieden = [...state.chars].filter(c => !c.ist_kanzler).sort((a, b) => a.mood - b.mood);
      if (unzufrieden.length > 0 && state.pk >= 8) {
        return { typ: 'kabinettsgespraech', charId: unzufrieden[0].id };
      }
      break;
    }
    case 5: {
      // Verbandsgespräch
      if (state.pk >= 10) {
        const verbaende = ['bdi', 'uvb', 'bvl', 'sgd', 'gbd'];
        const verbandId = verbaende[Math.floor(Math.random() * verbaende.length)];
        return { typ: 'verbandGespraech', verbandId };
      }
      break;
    }
  }

  // Fallback: Gesetze einbringen
  const gesetze = verfuegbareGesetze(state);
  if (gesetze.length > 0 && state.pk >= 15) {
    return { typ: 'einbringen', gesetzId: gesetze[0].id };
  }
  if (state.pk >= 5) return { typ: 'pressemitteilung' };
  return { typ: 'nichts' };
}

/** Alle Strategien */
export function alleStrategien(): Record<string, Strategy> {
  return {
    random: strategieRandom,
    immer_einbringen: strategieImmerEinbringen,
    nur_sparen: strategieNurSparen,
    nur_ausgaben: strategieNurAusgaben,
    pk_horten: strategiePkHorten,
    ideologisch_sdp: strategieIdeologischSdp,
    ideologisch_cdp: strategieIdeologischCdp,
    musterschueler: strategieMusterschueler,
    sparkommissar: strategieSparkommissar,
    koalitionsbrecher: strategieKoalitionsbrecher,
    medienmogul: strategieMedienmogul,
    verbands_freund: strategieVerbandsFreund,
    speed_runner: strategieSpeedRunner,
    bundesrat_profi: strategieBundesratProfi,
    kabinettspfleger: strategieKabinettspfleger,
    medienstratege: strategieMedienstratege,
    kommunalpolitiker: strategieKommunalpolitiker,
    wahlkaempfer: strategieWahlkaempfer,
    koalitionsmanager: strategieKoalitionsmanager,
    allrounder: strategieAllrounder,
  };
}
