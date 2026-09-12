# Grafik- & UX-Verbesserungsplan (Sept. 2026)

Ergebnis einer Inspektion aus sechs Perspektiven — **Rendering/Technik, visuelles Design,
Informationsarchitektur, Game Feel, Accessibility, Performance**. Anders als beim
[Verbesserungsplan](verbesserungsplan.md) (Balancing/Logik) wurde hier nicht nur der Code gelesen,
sondern der **Produktions-Build tatsächlich gebaut, ausgeliefert und im Browser durchgespielt**
(Chromium 1440×900 und 390×844, Offline-Fallback-Content). Alle Messwerte unten stammen aus diesem
Durchlauf und sind reproduzierbar.

**Legende:** ✅ in diesem Durchgang behoben · ⬜ offen

---

## Zusammenfassung

Die technische Basis ist gut (Token-System, 4 Themes, CSS Modules, tree-shaken ECharts,
i18n, 1004 Unit-Tests). Die **Lücke liegt zwischen Token-Ebene und Renderergebnis**: Charts,
Karten und Parlamentsgrafiken kennen das Token-System nicht, das Layout rechnet mit Magic
Numbers statt mit der tatsächlichen Chrome-Höhe, und die zentrale Spielaussage („Geht das
Gesetz durch?") ist grafisch schwächer codiert als nebensächliche Elemente.

Drei Befunde sind **Blocker**, zwei davon waren im laufenden Build nicht sichtbar, weil die
Tests genau die kaputte Stelle mocken.

---

## P0 — Blocker

### ✅ 1. Alle 13 ECharts-Komponenten crashten — App startete gar nicht

`echarts-for-react/lib/core` ist der **CommonJS**-Build des Pakets (`esm/` ist der ESM-Build,
`package.json` hat kein `exports`-Feld). Unter Vite 8/Rolldown liefert der Default-Import aus
diesem Pfad das Namespace-Objekt statt der Komponente:

```
Error: Element type is invalid: expected a string … but got: object.
Check the render method of `StartMapView`.
→ Produktions-Build: „Minified React error #130"
```

Da `StartMapView` im Hauptmenü hängt, fing die `ErrorBoundary` den Fehler ab und der
**gesamte Einstieg zeigte nur noch „Ein unerwarteter Fehler ist aufgetreten."** — in `npm run dev`
_und_ im Produktions-Build. Betroffen waren alle 13 Chart-Komponenten (Wahlprognose-Verlauf,
Koalitionsmeter, Bundesrat-Karte, Europa-Karte, Milieu-Bars, Wirtschafts-Dashboard, Radar,
Medienklima …).

**Behoben:** Import auf `echarts-for-react/esm/core` umgestellt (16 Dateien). Build, Lint und
alle 1004 Tests grün; Hauptmenü und Spielbrett rendern wieder.

**Warum das durch die CI kam:** Drei Testdateien mocken exakt den kaputten Pfad
(`vi.mock('echarts-for-react/lib/core', …)`), alle übrigen Chart-Komponenten haben keinen
Rendertest. `tsc` prüft nur Typen, nicht Laufzeit-Interop. → siehe P1-8.

### ⬜ 2. Offline-Modus ist ab Stufe 3 eine Sackgasse

Der gebündelte Fallback-Content (`data/defaults/scenarios.ts`, `DEFAULT_AGENDA_ZIELE`) enthält
**2 Agenda-Ziele**. `WahlnachtOnboarding.tsx:174` verlangt ab Komplexität 3 aber **3 Ziele**, und
`handleAgendaBestaetigen` bricht bei `length !== spielerZielAnzahl` ab — der Button bleibt
dauerhaft deaktiviert („Wähle 3 Ziele (aktuell 2/3)").

Praktische Folge: Da `config/playtest.ts` die Stufen 2 und 3 sperrt, sind nur Stufe 1 und 4
wählbar — **ohne Backend ist Stufe 4 unspielbar**, also genau die beworbene „Realpolitik"-Variante.
Im Durchlauf reproduziert.

**Fix:** Fallback-Pool auf mindestens `max(spielerZielAnzahl)` Ziele pro Kategorie aufstocken
_oder_ `spielerZielAnzahl` auf `min(3, verfügbarePoolgröße)` deckeln. Zusätzlich einen Test, der
für jede Komplexitätsstufe prüft, dass der Fallback-Content das Onboarding abschließen kann.

### ⬜ 3. Spielbrett passt nicht in den Viewport (Magic-Number-Layout)

`Shell.module.css` rechnet fix:

```css
height: calc(100vh - 48px - 40px); /* Header + TabBar */
```

`OfflineBanner` und `SaveHintBanner` sind darin nicht enthalten. Gemessen bei 1440×900:

| Größe | Wert |
|---|---|
| Viewport | 900 px |
| Shell beginnt bei | y = 171 px |
| Shell-Höhe | 812 px |
| Shell endet bei | y = 983 px → **83 px unterhalb des Fensters** |
| `document.scrollHeight` | 983 px (Seite scrollt vertikal) |

Damit verliert das 3-Spalten-Layout seine Kernidee: Die Panels haben eigenes Scrolling, aber
die Seite scrollt zusätzlich, sodass Header/TabBar wegscrollen und untere Panelinhalte
abgeschnitten wirken (im Screenshot bricht der linke Panel-Hintergrund bei y ≈ 790 ab).

**Fix:** Chrome-Höhe über eine CSS-Variable messen (`--chrome-h`, per `ResizeObserver` auf dem
Chrome-Wrapper gesetzt) oder das gesamte Shell als `display: grid; grid-template-rows: auto auto 1fr`
über `100dvh` aufbauen — dann entfällt die Rechnung ganz. `dvh` löst zusätzlich das
Mobile-Adressleisten-Problem.

---

## P1 — Grafik: das Theme endet an der Canvas-Kante

### ⬜ 4. Charts ignorieren das Theme-System vollständig

`ui/lib/echarts.ts` registriert **ein** Theme namens `politikpraxis` mit fest verdrahteten
Amtsstube-Farben (`#5a9870`, `#c05848`, `#c8a84b`, Achsen `#888`, Tooltip `#1e1c18`). Alle 13
Chart-Komponenten übergeben `theme="politikpraxis"`. Dazu kommen **111 hartcodierte Hex-Werte in
TSX** (Spitzenreiter: `EuropeMapChart` 12, `BundesratMap` 12, `KpiVerlaufChart` 11) und **86 Hex +
142 `rgba()`-Literale in den CSS-Modulen**.

Effekt beim Umschalten auf „Redaktion" (fast schwarz, roter Akzent) im Durchlauf verifiziert:
Hintergründe und Typo wechseln, aber das Koalitions-Gauge bleibt warm-oliv/gold, Achsenbeschriftungen
bleiben `#888`, Filter-Chips bleiben blau. Das Theme greift geschätzt auf ~70 % der Oberfläche.

**Fix (Reihenfolge):**

1. `getComputedStyle(document.documentElement).getPropertyValue('--gold')` beim Theme-Wechsel
   auslesen und **pro Theme ein ECharts-Theme registrieren**; die Chart-Komponenten bekommen den
   aktiven Theme-Namen aus `uiStore` statt der Konstante.
2. Eine kleine `chartTokens()`-Hilfsfunktion, die die Token als Objekt liefert — damit
   verschwinden die 111 Literale aus den TSX-Dateien.
3. ESLint-Regel (oder ein Stylelint-Lauf), die neue Hex-Literale in `src/ui` blockiert.

### ⬜ 5. `font: '11px var(--sans)'` funktioniert im Canvas nicht

`StartMapView.tsx` und das registrierte ECharts-Theme setzen CSS-Variablen in
Canvas-Font-Strings. Der Canvas-2D-Kontext löst **keine** CSS-Variablen auf — `ctx.font` wird
ungültig und fällt still auf die Browser-Default-Schrift zurück. Deshalb sehen Chart-Labels
anders aus als die umgebende UI. → Zusammen mit Punkt 4 beheben (konkrete Font-Stacks einsetzen).

### ⬜ 6. Bundestag-Halbkreis ist ein Donut, kein Parlament

`BundestagHalbkreis.tsx` zeichnet drei Ringsegmente in Array-Reihenfolge. Das ist die
Kernvisualisierung des Spiels und leistet weniger als sie soll:

- **Keine Sitzpunkte.** Die kanonische Parlamentsdarstellung sind einzelne Sitze auf
  konzentrischen Bögen. 600 Sitze als drei Tortenstücke lesen sich wie ein Umfrageergebnis,
  nicht wie ein Plenum.
- **Keine Links-Rechts-Ordnung.** Die Segmente folgen der Datenreihenfolge, nicht der
  politischen Achse — die einzige Information, die eine Halbkreisdarstellung gegenüber einem
  Balken überhaupt hinzufügt.
- **Keine Mehrheitsmarke.** Die entscheidende Frage („hat die Koalition > 50 %?") hat keine
  visuelle Schwelle.
- **Farben außerhalb des Systems.** Gesättigtes Rot + Mittelgrau neben der warmen UI; die
  Regierungspartei und die „Nationale Front" sind beide rot und kaum unterscheidbar.

**Fix:** Sitzpunkt-Layout (Radien nach Sitzzahl, Punkte pro Bogen), Sortierung nach einer
`achse`-Eigenschaft der Fraktion, 50-%-Marker als Radiallinie, Fraktionsfarben durch Token
laufen lassen (Kontrastprüfung gegen `--bg`). Reines SVG, kein Mehraufwand an Abhängigkeiten.

### ⬜ 7. Die wichtigste Zahl des Spiels ist der schwächste Balken

Die Ja-Quote eines Gesetzes („78 Ja / 22 Nein (78 %)") wird als **durchgehender 4-px-Goldbalken**
über die volle Kartenbreite gerendert — optisch ein Fortschrittsbalken, kein Abstimmungsergebnis.
Es fehlen: kontrastierendes Nein-Segment, 50-%-Schwellenmarke, Zustand „reicht/reicht nicht".

Die aufklappbare Herkunftstabelle darunter (Basis → Reaktion → effektive Quote) ist inhaltlich
stark und zahlt direkt auf Issue #270 ein — sie ist nur grafisch nicht als Ergebniszeile
ausgezeichnet.

**Fix:** Zweifarbiger Split-Balken mit Schwellenmarke und Status-Färbung (`--green`/`--red`),
Höhe 10–12 px, Ja/Nein-Zahlen an den Balkenenden. Eine Komponente, die auch der Bundesrat
wiederverwenden kann.

### ⬜ 8. Chart-Komponenten haben keine Rendertests

Ursache dafür, dass P0-1 unbemerkt blieb. 1004 Tests waren grün, während die Anwendung beim
ersten Frame abstürzte.

**Fix:** (a) Ein Smoke-Test, der `App` mit Offline-Fallback mountet und erwartet, dass kein
ErrorScreen erscheint. (b) Ein Playwright-Smoke-Job in `lint.yml`: Build → `vite preview` →
Hauptmenü und Spielbrett laden, `pageerror`-Ereignisse als Fehlschlag werten. Das hätte sowohl
P0-1 als auch P0-2 gefangen.

---

## P2 — Visuelle Komposition & Informationsarchitektur

### ⬜ 9. Ikonografie ist gemischt: Lucide-SVG neben Emoji

`ui/icons.tsx` sagt in der Kopfzeile ausdrücklich „ersetzt Emoji-Zeichen durch Lucide React
SVG-Icons" — die Ebenen-Tableiste nutzt aber weiterhin Emoji (📋 🏛 👥 💰 📰 🤝 ⚖️ 🗺 🏘 🇪🇺), ebenso
Offline-Banner (⚠️), Save-Hinweis (💡), Feedback-Button (🐛) und Geschwindigkeitsregler (⏸ ⏭).

Emoji nehmen die Theme-Farbe nicht an, sitzen auf abweichender Grundlinie, rendern je nach
Plattform unterschiedlich, und 🇪🇺 erscheint als vollfarbige Flagge zwischen monochromen
Piktogrammen. → Auf Lucide vereinheitlichen, `currentColor` nutzen.

### ⬜ 10. Rechte Spalte ist auf Stufe 1 zu ~80 % leer

Laut [UI-Architektur](../game-design/ui-architektur.md) trägt die rechte Spalte KPI-Kacheln
**und** Ereignisprotokoll. Auf Stufe 1 sind die Wirtschafts-KPIs featuregated, das Protokoll hat
in Monat 1 zwei Einträge — es bleiben 300 px Breite mit einem kleinen Kasten oben. Gleichzeitig
zeigt die linke Spalte ein leeres Wahlprognose-Diagramm (Achse 0–100 %, gestrichelte Ziellinie,
keine Datenreihe), weil in Monat 1 noch keine Historie existiert.

**Fix:** Leerzustände als bewusste Gestaltung (Platzhaltertext „Verlauf ab Monat 2"), und die
rechte Spalte auf niedrigen Stufen entweder schließen (2-Spalten-Grid) oder mit stufengerechtem
Inhalt füllen (z. B. Koalitionsziele, nächste Termine).

### ⬜ 11. Zwei Akzentfarben konkurrieren; in „Redaktion" kollidiert die Semantik

Die aktiven Filter-Chips der Gesetz-Agenda sind blau, während das gesamte übrige System Gold als
Akzent führt — zwei Primärfarben ohne Hierarchie.

Gravierender: Im Theme „Redaktion" gilt `--gold: #e63946` **und** `--red: #e63946` — Markenakzent
und Negativ-Signal sind bitgleich. Ein fallender KPI-Wert ist dann farblich nicht mehr von der
Marken-Auszeichnung unterscheidbar. Gleiches Muster in „Lageraum": `--gold` = `--green` = `#22d3a0`.

**Fix:** Akzent- und Semantikfarben in den Themes entkoppeln (semantische Farben dürfen nie mit
`--gold` zusammenfallen), Filter-Chips auf das Akzent-Token umstellen.

### ⬜ 12. Zwei Onboarding-Overlays gleichzeitig

Beim ersten Spielstart erscheinen `IntroTour` („Schritt 1 von 5") und ein `GameTips`-Hinweis
(„Dein erstes Gesetz") **übereinander** — dazu ein dritter Erklärkasten („Verstanden") in der
Bundestag-Ansicht, in einem vierten Stil. Drei Erklärmuster, die um dieselbe Aufmerksamkeit
konkurrieren.

**Fix:** Ein Hinweis-Queue im `uiStore`: `GameTips` pausieren, solange die `IntroTour` läuft; die
Inline-Erklärkästen auf das `Erklaerung`-Muster vereinheitlichen. Zahlt auf Issue #281 ein.

### ⬜ 13. Vertikale Chrome frisst den Bildschirm

Gemessen: Offline-Banner (32 px) + Save-Hinweis (46 px) + Header (48 px) + Tableiste (40 px)
= **166 px** dauerhafte Kopfzone bei 900 px Höhe. Auf 390×844 (Phone) wachsen dieselben Elemente
durch Umbruch auf **~480 px — mehr als die Hälfte des Bildschirms**, bevor eine einzige
Spielinformation sichtbar wird; die Tableiste bricht auf vier Zeilen um, der Header auf vier.

**Fix:** Save-Hinweis in den Header integrieren (Icon + Tooltip statt Vollbreitband), Offline-Banner
als kompakter Status-Chip, Tableiste auf Mobile als horizontal scrollbare Leiste oder „Mehr"-Menü.

### ⬜ 14. Gesperrte Ebenen dominieren die Navigation

Auf Stufe 1 tragen 7 von 10 Tabs ein Schloss. Die Leiste kommuniziert damit primär, was der
Spieler _nicht_ tun kann.

**Fix:** Gesperrte Ebenen zusammenfassen (z. B. ein „+7 später"-Element mit Popover statt sieben
ausgegrauter Tabs) — behält die Progressionsneugier, ohne die Navigation zu blockieren.

---

## P3 — Accessibility

### ⬜ 15. `--text3` erfüllt in keinem Theme die WCAG-AA-Schwelle

Kontrastwerte (berechnet nach WCAG 2.1, alle Token-Kombinationen):

| Theme | `--text3` auf `--bg` … `--bg4` | AA-Quote (4,5:1) aller Vordergrund/Hintergrund-Paare |
|---|---|---|
| Amtsstube (Default) | 2,32 – 1,76 | **15/32** |
| Brüssel | 2,26 – 1,70 | 18/32 |
| Redaktion | 2,22 – 1,85 | 23/32 |
| Lageraum | 2,24 – 1,66 | 27/32 |

`--text3` wird an **76 Stellen** als Textfarbe verwendet — u. a. für die Panel-Überschriften
(„WAHLPROGNOSE", „KOALITIONSSTABILITÄT", „MILIEUS"), KPI-Popover-Titel und `.btn-ghost`. Im
Screenshot sind diese Labels tatsächlich kaum lesbar.

Zusätzlich liegt in Amtsstube — dem **Default-Theme** — auch `--red` auf `--bg4` bei 2,97:1 und
`--text2` auf `--bg3` bei 4,44:1.

**Fix:** `--text3` auf ≥ 4,5:1 gegen `--bg2` aufhellen (Amtsstube ca. `#8a8272`), `--text2`
leicht nachziehen, Semantikfarben für Fließtext prüfen. Ein Vitest-Test, der die Token-Matrix
gegen 4,5:1 (Text) bzw. 3:1 (UI-Elemente) prüft, hält das dauerhaft.

### ⬜ 16. Kein `prefers-contrast` / `forced-colors`

`prefers-reduced-motion` ist global sauber abgedeckt (`global.css`). Für erhöhten Kontrast und
den Windows-Kontrastmodus gibt es keine Behandlung — bei 56 `animation:`-Deklarationen und
durchgehend tokenbasierten Farben wäre ein High-Contrast-Block billig zu ergänzen.

### ⬜ 17. i18n-Pluralformen fehlen stellenweise

Im Durchlauf: „Dein Kabinett. **1 Persönlichkeiten, 1 Agenden.**" und „Bildung & Forschung
**(1 Gesetze)**". i18next-Pluralregeln (`_one`/`_other`) sind vorhanden, werden an diesen Stellen
aber nicht genutzt.

---

## P4 — Performance

### ⬜ 18. Das Hauptmenü lädt ~430 KB für eine dekorative Hintergrundkarte

Gemessene Transfergrößen der Startseite (Produktions-Build, `vite preview`):

| Ressource | Größe |
|---|---|
| `echarts-vendor-*.js` | **228 KB** (704 KB unkomprimiert) |
| `europe.geojson` | **172 KB** (unminifiziert ausgeliefert) |
| `germany-bundeslaender.geojson` | 27 KB |
| Rest (App, React, i18n, Fonts) | ~110 KB |

`echarts-vendor` steht als `modulepreload` in `index.html` und wird damit **vor jeder Interaktion**
geladen — allein, weil `StartMapView` im Hauptmenü hängt. Diese Karte ist `aria-hidden`, nicht
interaktiv, statisch (`animation: false`) und im Layout zum großen Teil links aus dem Bild
geschnitten.

**Fix:** Die Startkarte einmalig als optimiertes SVG vorrendern (wenige KB, sofort sichtbar,
theme-fähig über `currentColor`) und ECharts per `React.lazy` erst im Spiel laden. Erwartete
Ersparnis auf der Startseite: **~400 KB / ~90 % des Payloads**. Zusätzlich die GeoJSONs
vereinfachen (`mapshaper`) und mit `Cache-Control: immutable` ausliefern.

### ⬜ 19. 23 Komponenten abonnieren den gesamten `gameStore`

`useGameStore()` ohne Selektor in u. a. `CenterPanel`, `GesetzAgendaView`, `AgendaCard`,
`KabinettView`, `HaushaltView`, `VerbaendeView`, `EbeneView`, `MediaView`. Jeder Monats-Tick
schreibt in `state` — damit rendern alle 23 Teilbäume neu, auch wenn sie nichts Betroffenes
anzeigen. Bei 2× (1 Sek/Monat) und einer AgendaCard pro Gesetz ist das der wahrscheinlichste
Ruckel-Kandidat und deckt sich mit dem Roadmap-Punkt „Performance: Tick-/UI-Hotspots".

**Fix:** Schrittweise auf `useShallow`-Selektoren umstellen (das Muster existiert bereits in
`Header.tsx`), beginnend bei `AgendaCard` (n-fach instanziiert) und `CenterPanel`.

### ⬜ 20. Doppelte Keyframes

`pulse` 4×, `fadeIn` 3×, `slideIn` 2×, `scaleIn` 2× über verschiedene CSS-Module verteilt —
teils mit abweichenden Werten. `global.css` hat die gemeinsamen Definitionen bereits; die
Duplikate stammen aus der Zeit davor (siehe `plan.md`, Punkt 6, nie abgeschlossen).

---

## Umsetzungsreihenfolge

| # | Schritt | Aufwand | Wirkung |
|---|---|---|---|
| ✅ | **P0-1** ECharts-Import (`esm/core`) | XS | App startet überhaupt wieder |
| 1 | **P0-3** Shell-Layout auf `dvh`/Grid ohne Magic Numbers | S | Spielbrett passt in den Viewport |
| 2 | **P0-2** Fallback-Agenda-Ziele + Onboarding-Test | S | Offline-Modus wird spielbar |
| 3 | **P1-8** Playwright-Smoke-Job in der CI | S | verhindert Wiederholung von P0-1/2 |
| 4 | **P3-15** Kontrast-Token korrigieren + Token-Test | S | Lesbarkeit, WCAG AA |
| 5 | **P4-18** Startkarte als SVG, ECharts lazy | M | −400 KB auf der Startseite |
| 6 | **P1-4/5** Chart-Theming über Tokens, Canvas-Fonts | M | Themes wirken vollständig |
| 7 | **P1-7** Abstimmungs-Balken als Split + Schwelle | S | Kernaussage wird lesbar (#270) |
| 8 | **P2-9** Emoji → Lucide | S | konsistente Ikonografie |
| 9 | **P2-13** Chrome-Höhe reduzieren, Mobile-Tableiste | M | +166 px Spielfläche, Phone nutzbar |
| 10 | **P1-6** Bundestag als Sitzpunkt-Grafik | M | Signature-Visual des Spiels |
| 11 | **P2-12** Onboarding-Overlays serialisieren | S | erster Eindruck (#281) |
| 12 | **P4-19** Store-Selektoren in Hot-Path-Komponenten | M | Tick-Performance |
| 13 | **P2-10/11/14** Leerzustände, Akzentfarben, Tab-Sperren | M | visuelle Kohärenz |
| 14 | **P3-16/17, P4-20** Kontrastmodus, Plurale, Keyframes | S | Feinschliff |

**Nicht in diesem Plan:** Balancing und Spiellogik (siehe [Verbesserungsplan](verbesserungsplan.md)
und die offenen Issues #267, #272, #275–#285) sowie Audio/Sound, das laut
[Roadmap](../game-design/roadmap.md) bewusst auf v1.0 vertagt ist.

---

## Reproduktion

```bash
cd frontend
npm ci && npm run build
npx vite preview --port 5173        # ohne Backend → Offline-Fallback
# Hauptmenü → Neues Spiel → Kanzleramt → Kandidatur annehmen → Onboarding durchklicken
```

Die Kontrastwerte in P3-15 folgen der WCAG-2.1-Relativluminanz über die Token aus
`src/styles/tokens.css`; die Payload-Zahlen in P4-18 stammen aus
`performance.getEntriesByType('resource')` auf der Startseite.
