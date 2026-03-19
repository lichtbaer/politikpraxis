/**
 * Achievement-System: Tracks player accomplishments across games.
 * Achievements are checked at game end and stored in localStorage.
 */
import type { GameState } from '../types';

export interface Achievement {
  id: string;
  title: string;
  desc: string;
  /** Check function — returns true if achievement is earned */
  check: (state: GameState) => boolean;
}

const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'erste_legislatur',
    title: 'Erste Legislatur',
    desc: 'Spiele eine Legislaturperiode bis zum Ende.',
    check: (s) => s.gameOver,
  },
  {
    id: 'wiedergewaehlt',
    title: 'Wiedergewählt',
    desc: 'Gewinne die Wahl am Ende der Legislatur.',
    check: (s) => s.won === true,
  },
  {
    id: 'erdrutschsieg',
    title: 'Erdrutschsieg',
    desc: 'Gewinne mit über 55% Zustimmung.',
    check: (s) => s.won === true && s.zust.g > 55,
  },
  {
    id: 'gesetzesmaschine',
    title: 'Gesetzesmaschine',
    desc: 'Beschließe mindestens 10 Gesetze.',
    check: (s) => s.gesetze.filter((g) => g.status === 'beschlossen').length >= 10,
  },
  {
    id: 'sparfuchs',
    title: 'Sparfuchs',
    desc: 'Beende die Legislatur mit positivem Haushaltssaldo.',
    check: (s) => s.gameOver && (s.haushalt?.saldo ?? 0) >= 0,
  },
  {
    id: 'koalitionsfluesterer',
    title: 'Koalitionsflüsterer',
    desc: 'Halte die Koalitionsbeziehung über 70 bis zum Ende.',
    check: (s) => s.gameOver && (s.koalitionspartner?.beziehung ?? 0) >= 70,
  },
  {
    id: 'krisenmanager',
    title: 'Krisenmanager',
    desc: 'Bewältige mindestens 15 Ereignisse.',
    check: (s) => (s.firedEvents?.length ?? 0) >= 15,
  },
  {
    id: 'europa_verfechter',
    title: 'Europa-Verfechter',
    desc: 'Setze mindestens ein Gesetz über die EU-Route durch.',
    check: (s) => s.gesetze.some((g) => g.route === 'eu' && g.status === 'beschlossen'),
  },
  {
    id: 'basisdemokrat',
    title: 'Basisdemokrat',
    desc: 'Nutze erfolgreich einen kommunalen Piloten.',
    check: (s) => s.gesetze.some((g) => g.route === 'kommune' && (g.rprog ?? 0) >= (g.rdur ?? 1)),
  },
  {
    id: 'volksnahe',
    title: 'Volksnähe',
    desc: 'Erreiche in allen Milieus mindestens 40% Zustimmung.',
    check: (s) => {
      if (!s.milieuZustimmung) return false;
      const vals = Object.values(s.milieuZustimmung);
      return vals.length >= 4 && vals.every((v) => v >= 40);
    },
  },
];

const STORAGE_KEY = 'politikpraxis_achievements';

function getUnlockedAchievements(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveAchievements(ids: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
}

/**
 * Check and unlock achievements for a completed game.
 * Returns the list of newly unlocked achievement IDs.
 */
export function checkAchievements(state: GameState): Achievement[] {
  const unlocked = getUnlockedAchievements();
  const newlyUnlocked: Achievement[] = [];

  for (const achievement of ACHIEVEMENTS) {
    if (unlocked.has(achievement.id)) continue;
    if (achievement.check(state)) {
      unlocked.add(achievement.id);
      newlyUnlocked.push(achievement);
    }
  }

  if (newlyUnlocked.length > 0) {
    saveAchievements(unlocked);
  }

  return newlyUnlocked;
}

/**
 * Get all achievements with their unlock status.
 */
export function getAllAchievements(): (Achievement & { unlocked: boolean })[] {
  const unlocked = getUnlockedAchievements();
  return ACHIEVEMENTS.map((a) => ({ ...a, unlocked: unlocked.has(a.id) }));
}
