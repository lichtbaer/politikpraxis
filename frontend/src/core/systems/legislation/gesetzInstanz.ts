import type { Law } from '../../types';

/**
 * Macht aus einem Content-Gesetz den Eintrag in `state.gesetze`.
 *
 * Genutzt beim Spielstart und wenn ein Event ein gesperrtes Gesetz
 * (`locked_until_event`) freischaltet — beide Wege müssen denselben Startzustand
 * erzeugen. Die Sperre selbst wird dabei entfernt: Im Spielstand ist ein Gesetz
 * entweder vorhanden (und damit verfügbar) oder gar nicht.
 */
export function instanziiereGesetz(gesetz: Law, effektiveJa: number): Law {
  const { locked_until_event: _gesperrt, ...rest } = gesetz;
  return {
    ...rest,
    ja: effektiveJa,
    nein: 100 - effektiveJa,
    expanded: false,
    route: null,
    rprog: 0,
    rdur: 0,
    blockiert: null,
  };
}
