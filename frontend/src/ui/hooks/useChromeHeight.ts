import { useEffect, type RefObject } from 'react';

/**
 * Schreibt die Höhe der Kopfzone (Banner, Header, Tableiste) als `--chrome-h`
 * auf das Wurzelelement.
 *
 * Die Drawer-Panels auf Tablet/Mobile sind `position: fixed` und müssen unterhalb
 * dieser Zone beginnen. Ihre Höhe ist nicht konstant: Banner erscheinen und
 * verschwinden, der Header bricht auf schmalen Viewports um. Statt einer festen
 * px-Rechnung (vorher `top: 88px`) wird die tatsächliche Höhe gemessen.
 *
 * Das Spielbrett selbst braucht das nicht — seine Höhe ergibt sich aus der
 * Flex-Spalte in `global.css` (`#root`).
 */
export function useChromeHeight(ref: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const update = () => {
      const height = Math.max(0, Math.round(el.getBoundingClientRect().height));
      document.documentElement.style.setProperty('--chrome-h', `${height}px`);
    };

    update();

    // ResizeObserver fehlt in älteren jsdom-Versionen (Unit-Tests) — dann bleibt der
    // einmalig gemessene Wert stehen, was für Tests ausreicht.
    const RO = typeof ResizeObserver !== 'undefined' ? ResizeObserver : null;
    const observer = RO ? new RO(update) : null;
    observer?.observe(el);
    window.addEventListener('resize', update);

    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', update);
      document.documentElement.style.removeProperty('--chrome-h');
    };
  }, [ref]);
}
