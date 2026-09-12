/**
 * Render-Smoke-Test gegen den ausgelieferten Produktions-Build.
 *
 * Warum: Die Unit-Suite mockt die Chart-Bibliothek weg. Als der ECharts-Import
 * unter Vite 8 das Namespace-Objekt statt der Komponente lieferte, waren 1004
 * Tests gruen, waehrend die App beim ersten Frame in die ErrorBoundary lief und
 * nur noch den Fehlerscreen zeigte. Dieser Test laedt die echten Seiten in einem
 * echten Browser und faellt bei jedem uncaught error durch.
 *
 * Laeuft bewusst ohne Backend: damit greift der Offline-Fallback — genau der Pfad,
 * der bei der Onboarding-Sackgasse (2 von 3 geforderten Agendazielen) brach.
 *
 * Aufruf:  node scripts/smoke.mjs [baseUrl]      (Default: http://127.0.0.1:4173)
 *
 * In CI laedt `npx playwright install --with-deps chromium` den passenden Browser.
 * Umgebungen mit vorinstalliertem Chromium koennen ihn ueber
 * PLAYWRIGHT_CHROMIUM_PATH=/pfad/zu/chrome uebersteuern.
 */
import { chromium } from 'playwright';

const BASE = process.argv[2] ?? process.env.SMOKE_BASE_URL ?? 'http://127.0.0.1:4173';
const EXECUTABLE_PATH = process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined;
const VIEWPORT = { width: 1440, height: 900 };
/** Text des ErrorScreen — erscheint, wenn die ErrorBoundary gegriffen hat. */
const ERROR_SCREEN = /Ein unerwarteter Fehler ist aufgetreten|An unexpected error occurred/i;

const failures = [];
function check(ok, message) {
  if (ok) {
    console.log(`  ok   ${message}`);
  } else {
    console.log(`  FAIL ${message}`);
    failures.push(message);
  }
}

/** Sammelt uncaught errors und Konsolenfehler, die nicht vom fehlenden Backend kommen. */
function watchErrors(page, sink) {
  page.on('pageerror', (e) => sink.push(`pageerror: ${String(e).slice(0, 300)}`));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const text = m.text();
    // Ohne Backend sind 502/404 auf /api erwartet — der Offline-Fallback faengt sie ab.
    if (/Failed to load resource/i.test(text)) return;
    sink.push(`console.error: ${text.slice(0, 300)}`);
  });
}

/** Chrome-Elemente, die nie ein Onboarding-Schritt sind. */
const NOISE = /Erneut verbinden|Reconnect|^EN$|^DE$|Anmelden|Sign in|Feedback/i;
const WEITER = /Weiter|Continue|bestätigen|confirm|Regierung|Start|Los geht/i;

/** Sichtbare, aktivierbare Buttons mit ihrem Text. */
async function enabledButtons(page) {
  const locator = page.locator('button:visible:not([disabled])');
  const labels = await locator.allInnerTexts();
  return labels
    .map((text, index) => ({ text: text.trim(), index }))
    .filter((b) => b.text && !NOISE.test(b.text))
    .map((b) => ({ ...b, locator: locator.nth(b.index) }));
}

/** Klickt sich vom Setup bis zum Spielbrett durch das Onboarding. */
async function reachBoard(page, stufeLabel) {
  await page.getByRole('button', { name: /Neues Spiel|New game/i }).click();
  await page.waitForTimeout(800);
  await page.getByText(stufeLabel, { exact: false }).first().click().catch(() => {});
  await page.getByRole('button', { name: /Kandidatur annehmen|Accept/i }).click();

  for (let step = 0; step < 24; step++) {
    const body = await page.innerText('body');
    if (ERROR_SCREEN.test(body)) return { reached: false, reason: 'ErrorScreen im Onboarding' };
    if (/Ereignisprotokoll|Event log/i.test(body)) return { reached: true };

    let buttons = await enabledButtons(page);

    // Agenda-Beat: erst Ziele anhaken, sonst bleibt "Agenda bestätigen" inaktiv.
    // Genau hier lief der Offline-Fallback in eine Sackgasse (2 Ziele, 3 gefordert).
    if (/Wähle \d+ Ziele|Pick \d+ goals/i.test(body)) {
      for (const goal of buttons.filter((b) => !WEITER.test(b.text))) {
        await goal.locator.click({ timeout: 3000 }).catch(() => {});
      }
      await page.waitForTimeout(300);
      buttons = await enabledButtons(page);
    }

    if (buttons.length === 0) {
      return { reached: false, reason: `keine aktive Option in Schritt ${step + 1}` };
    }
    const next = buttons.find((b) => WEITER.test(b.text)) ?? buttons[buttons.length - 1];
    await next.locator.click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(450);
  }
  return { reached: false, reason: 'Onboarding nach 24 Schritten nicht abgeschlossen' };
}

/** Notbremse: der Job darf in CI nie haengen bleiben. */
const WATCHDOG_MS = Number(process.env.SMOKE_TIMEOUT_MS ?? 240_000);
const watchdog = setTimeout(() => {
  console.error(`\nSmoke-Test abgebrochen: Zeitlimit von ${WATCHDOG_MS} ms überschritten.`);
  process.exit(1);
}, WATCHDOG_MS);
watchdog.unref?.();

const browser = await chromium.launch({ executablePath: EXECUTABLE_PATH });

try {
  // ── 1. Hauptmenue ─────────────────────────────────────────────────────────
  console.log('Hauptmenü');
  {
    const errors = [];
    const page = await browser.newPage({ viewport: VIEWPORT });
    watchErrors(page, errors);
    await page.goto(BASE, { waitUntil: 'load', timeout: 60_000 });
    await page.waitForTimeout(4000);

    const body = await page.innerText('body');
    check(!ERROR_SCREEN.test(body), 'kein ErrorScreen');
    check(/Neues Spiel|New game/i.test(body), 'Startbutton sichtbar');
    check(errors.length === 0, `keine Laufzeitfehler${errors.length ? ` (${errors[0]})` : ''}`);
    await page.close();
  }

  // ── 2. Spielbrett auf der einfachsten und der vollen Stufe ────────────────
  for (const [stufe, label] of [
    ['Stufe 1', 'Kanzleramt'],
    ['Stufe 4', 'Realpolitik'],
  ]) {
    console.log(`${stufe} (${label})`);
    const errors = [];
    const page = await browser.newPage({ viewport: VIEWPORT });
    watchErrors(page, errors);
    page.setDefaultTimeout(15_000);
    await page.goto(BASE, { waitUntil: 'load', timeout: 60_000 });
    await page.waitForTimeout(3000);

    const result = await reachBoard(page, label);
    check(result.reached, `Spielbrett erreicht${result.reached ? '' : ` — ${result.reason}`}`);

    if (result.reached) {
      await page.waitForTimeout(2500);
      // Charts rendern in <canvas>. Fehlen sie, ist die Chart-Bibliothek tot —
      // genau der Zustand, den die gemockten Unit-Tests nicht sehen.
      const canvases = await page.locator('canvas').count();
      check(canvases > 0, `mindestens ein Chart-Canvas gerendert (${canvases})`);

      // Das Brett muss in den Viewport passen: kein Seiten-Scroll durch Chrome-Hoehe.
      const overflow = await page.evaluate(
        () => document.documentElement.scrollHeight - window.innerHeight,
      );
      check(overflow <= 1, `kein vertikaler Seiten-Überlauf (${overflow} px)`);
    }

    check(errors.length === 0, `keine Laufzeitfehler${errors.length ? ` (${errors[0]})` : ''}`);
    await page.close();
  }
} finally {
  await browser.close();
  clearTimeout(watchdog);
}

if (failures.length > 0) {
  console.error(`\nSmoke-Test fehlgeschlagen (${failures.length}):`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log('\nSmoke-Test bestanden.');
