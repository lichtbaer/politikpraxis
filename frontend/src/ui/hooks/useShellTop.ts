import { useEffect, type RefObject } from 'react';

/**
 * Schreibt die Oberkante des Spielbretts als `--shell-top` auf das Wurzelelement.
 *
 * Die Drawer-Panels auf Tablet/Mobile sind `position: fixed` und müssen unterhalb der
 * Chrome (Offline-Banner, Speicher-Hinweis, Header, Tableiste) beginnen. Deren Höhe ist
 * nicht konstant — Banner erscheinen und verschwinden, der Header bricht auf schmalen
 * Viewports um. Statt einer festen px-Rechnung wird die tatsächliche Position gemessen.
 *
 * Das Spielbrett selbst braucht das nicht: seine Höhe ergibt sich aus der Flex-Spalte
 * in `global.css` (`#root`).
 */
export function useShellTop(ref: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const update = () => {
      const top = Math.max(0, Math.round(el.getBoundingClientRect().top));
      document.documentElement.style.setProperty('--shell-top', `${top}px`);
    };

    update();

    // ResizeObserver fehlt in älteren jsdom-Versionen (Unit-Tests) — dann bleibt der
    // einmalig gemessene Wert stehen, was für Tests ausreicht.
    const RO = typeof ResizeObserver !== 'undefined' ? ResizeObserver : null;
    const observer = RO ? new RO(update) : null;
    observer?.observe(document.body);
    window.addEventListener('resize', update);

    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', update);
      document.documentElement.style.removeProperty('--shell-top');
    };
  }, [ref]);
}
