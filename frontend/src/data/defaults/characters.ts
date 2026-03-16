import type { Character } from '../../core/types';

export const DEFAULT_CHARACTERS: Character[] = [
  {
    id: 'kanzler', name: 'Anna Hoffmann', role: 'Kanzlerin', initials: 'AH', color: '#8a7030',
    mood: 3, loyalty: 5,
    bio: 'Führt die Koalition mit pragmatischem Kurs. Hält die Fäden zusammen — aber erwartet Loyalität zurück.',
    interests: ['Koalitionsstabilität', 'Wiederwahl'],
    bonus: { trigger: 'mood>=3', desc: 'Gibt +5 BT-Stimmen für alle Gesetze', applies: 'bt_bonus' },
    ultimatum: { moodThresh: 1, event: 'kanzler_ultimatum' },
  },
  {
    id: 'fm', name: 'Robert Lehmann', role: 'Finanzminister', initials: 'RL', color: '#5888b8',
    mood: 2, loyalty: 3,
    bio: 'Strenger Haushälter der CDU. Widersetzt sich teuren Reformen konsequent — hat aber meistens Recht.',
    interests: ['Haushaltsdisziplin', 'Schuldenbremse'],
    bonus: { trigger: 'mood>=4', desc: 'Beschleunigt Gesetze ohne Haushaltskosten', applies: 'hh_boost' },
    ultimatum: { moodThresh: 0, event: 'fm_ultimatum' },
  },
  {
    id: 'wm', name: 'Petra Maier', role: 'Wirtschaftsministerin', initials: 'PM', color: '#5a9870',
    mood: 4, loyalty: 4,
    bio: 'Pragmatisch und lösungsorientiert. Wichtige Verbündete — pflegt Kontakte zur Industrie und zu Länderchefs.',
    interests: ['Standortpolitik', 'Industrietransformation'],
    bonus: { trigger: 'mood>=3', desc: '+3% BT-Stimmen für Wirtschaftsgesetze', applies: 'wirt_bonus' },
    ultimatum: { moodThresh: 0, event: 'wm_ultimatum' },
  },
  {
    id: 'im', name: 'Klaus Braun', role: 'Innenminister', initials: 'KB', color: '#c05848',
    mood: 1, loyalty: 2,
    bio: 'Konservativer Querdenker. Misstraut der Koalition grundsätzlich — sucht aktiv nach Gründen zu torpedieren.',
    interests: ['Innere Sicherheit', 'Migrationsbegrenzung'],
    bonus: { trigger: 'mood>=4', desc: 'Stabilisiert Bundesrat-Stimmen in 3 Ländern', applies: 'br_bonus' },
    ultimatum: { moodThresh: 0, event: 'braun_ultimatum' },
  },
  {
    id: 'jm', name: 'Sara Kern', role: 'Justizministerin', initials: 'SK', color: '#9a8848',
    mood: 4, loyalty: 4,
    bio: 'Juristin mit unbedingten Prinzipien. Blockiert verfassungswidrige Vorhaben — schützt aber auch die Koalition vor teuren Fehlern.',
    interests: ['Rechtsstaat', 'Grundrechte'],
    bonus: { trigger: 'mood>=3', desc: 'Verhindert Verfassungsklagen gegen Gesetze', applies: 'jm_shield' },
    ultimatum: { moodThresh: 1, event: 'kern_ultimatum' },
  },
  {
    id: 'um', name: 'Jonas Wolf', role: 'Umweltminister', initials: 'JW', color: '#6880b8',
    mood: 3, loyalty: 3,
    bio: 'Treibt Klimapolitik voran, manchmal gegen den Rest des Kabinetts. Starkes Netzwerk bei progressiven Wählern.',
    interests: ['Klimaschutz', 'Energiewende'],
    bonus: { trigger: 'mood>=4', desc: '+4% Zustimmung im progressiven Milieu', applies: 'prog_boost' },
    ultimatum: { moodThresh: 1, event: 'wolf_ultimatum' },
  },
];
