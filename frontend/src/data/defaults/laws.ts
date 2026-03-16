import type { Law } from '../../core/types';

export const DEFAULT_LAWS: Law[] = [
  {
    id: 'ee', titel: 'Erneuerbare-Energien-Beschleunigungsgesetz', kurz: 'EE-BeschG',
    desc: 'Verdopplung der Ausbauziele, vereinfachte Genehmigung.',
    tags: ['bund', 'eu'], status: 'entwurf', ja: 48, nein: 52,
    effekte: { hh: -0.4, zf: 5, gi: -0.5, al: -0.3 }, lag: 4,
    expanded: false, route: null, rprog: 0, rdur: 0, blockiert: null,
  },
  {
    id: 'wb', titel: 'Bundeswohnungsbauoffensive', kurz: 'BWO',
    desc: '400.000 neue Wohnungen p.a., Baurechtsreform.',
    tags: ['bund', 'land', 'kommune'], status: 'entwurf', ja: 55, nein: 45,
    effekte: { hh: -0.6, zf: 8, gi: -1.2, al: -0.5 }, lag: 6,
    expanded: false, route: null, rprog: 0, rdur: 0, blockiert: null,
  },
  {
    id: 'sr', titel: 'Unternehmenssteuerreform', kurz: 'USR',
    desc: 'Körperschaftsteuer 15%, Gegenfinanzierung Digitalsteuer.',
    tags: ['bund', 'eu'], status: 'entwurf', ja: 51, nein: 49,
    effekte: { hh: -0.2, zf: 3, gi: 1.5, al: -0.8 }, lag: 5,
    expanded: false, route: null, rprog: 0, rdur: 0, blockiert: null,
  },
  {
    id: 'bp', titel: 'Nationales Bildungspaket', kurz: 'NBP',
    desc: 'Bundesfinanzierung Schulen via Kooperationsartikel.',
    tags: ['land', 'bund'], status: 'entwurf', ja: 53, nein: 47,
    effekte: { hh: -0.5, zf: 6, gi: -0.8, al: -0.1 }, lag: 8,
    expanded: false, route: null, rprog: 0, rdur: 0, blockiert: null,
  },
];
