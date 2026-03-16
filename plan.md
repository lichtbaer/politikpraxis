# Design-Polierungsplan — Politikpraxis / Bundesrepublik

## Zusammenfassung der Analyse

Nach Durchsicht aller 27 CSS-Module und zugehörigen Komponenten gibt es mehrere Bereiche, die Polierung vertragen. Die Grundstruktur (Token-System, 4 Themes, CSS Modules) ist solide — es geht primär um **Konsistenz**, **fehlende Micro-Interactions**, **visuelle Hierarchie** und **Feinschliff**.

---

## 1. Inkonsistente Einheiten (rem vs. px)

**Problem:** Manche Dateien nutzen `rem` (EventCard, AgendaCard, MediaView), andere `px` (alle Screens, Header, Panels, KPITile). Das ist ein Mix, der bei Zoom-/Accessibility-Einstellungen problematisch wird.

**Plan:** Alle `rem`-basierten Dateien auf `px` vereinheitlichen (da die Mehrheit `px` nutzt und `font-size: 14px` auf `body` gesetzt ist).

**Dateien:**
- `EventCard.module.css` — rem → px
- `AgendaCard.module.css` — rem → px
- `MediaView.module.css` — rem → px

---

## 2. Duplizierte Button-Styles konsolidieren

**Problem:** Primary-Buttons werden in 5+ Dateien separat definiert (MainMenu, Setup, GameSetup, WahlnachtOnboarding, EndScreen) mit leicht unterschiedlichen Werten. Ebenso Secondary/Back-Buttons.

**Plan:** Shared Button-Klassen in `global.css` definieren und in den Komponenten wiederverwenden. Das verhindert Drift und sorgt für konsistentes Verhalten.

**Neue gemeinsame Styles:**
- `.btn-primary` — Gold-Background, scale-hover, box-shadow
- `.btn-secondary` — bg3-Background, border, subtle hover
- `.btn-ghost` — Transparenter Back-Button

---

## 3. Fehlende Focus-States (Accessibility)

**Problem:** Kein einziger Button oder interaktives Element hat einen `:focus-visible`-Style. Keyboard-Nutzer sehen keinen Fokus-Indikator.

**Plan:** Globalen `:focus-visible`-Style in `global.css` hinzufügen mit einem `outline` im `--gold`-Farbton + `outline-offset`.

---

## 4. Toast braucht Fade-Out Animation

**Problem:** Der Toast hat nur `toastFadeIn`, aber keinen Fade-Out. Er verschwindet abrupt.

**Plan:** `toastFadeOut`-Animation hinzufügen und über den Toast-Lifecycle (JS-seitig Klasse togglen) steuern.

---

## 5. Hover-Zustände verbessern

**Problem:** Viele Hover-Effekte nutzen nur `opacity: 0.9` oder `0.95` — das ist kaum wahrnehmbar. Einige Buttons haben gar keinen Hover (z.B. `btnGespraech` in BundesratView).

**Plan:**
- Primary-Buttons: `translateY(-1px)` + verstärkter `box-shadow` statt nur opacity
- Kacheln/Cards: Subtiler `border-color`-Shift + leichter `box-shadow`
- Fehlende Hover-States ergänzen bei: `btnGespraech`, `btnReparatur`

---

## 6. Animationen & Transitions verfeinern

**Problem:**
- `@keyframes fadeIn` ist in 4 Dateien dupliziert (MainMenu, Setup, GameSetup, Credits)
- `@keyframes slideIn` ist in 2 Dateien dupliziert (global.css, EventCard)
- Keine Stagger-Delays für Listen-Items (KPI-Grid, Kabinett, Agenda-Cards)

**Plan:**
- Alle Keyframes nach `global.css` verschieben, Duplikate entfernen
- Stagger-Animations für Listen-Items über `animation-delay` mit CSS-Variable `--i`
- Subtile `transition` auf EventCard-Choices für besseres Feedback

---

## 7. EndScreen aufwerten

**Problem:** Der EndScreen ist sehr minimal — nur Text und ein Button. Für ein Spielende fehlt das "Wow".

**Plan:**
- Größerer Titel mit Glow-Effekt (text-shadow im Theme-Gold)
- Stats als Grid-Kacheln statt einfacher Liste
- Subtile Background-Animation (wie MainMenu `pulse`)
- Confetti/Partikel-Effekt für Sieg (optional, rein CSS-basiert)

---

## 8. LobbyingOverlay & CharacterDetail — Modal-Backdrop verbessern

**Problem:** `rgba(0,0,0,0.6)` bzw. `0.65` ist ein Hardcode — passt nicht zu allen Themes. Auch fehlt eine Öffnungs-Animation.

**Plan:**
- Backdrop-Farbe über Token steuern: `--backdrop: rgba(0,0,0,0.6)` in tokens.css
- `backdrop-filter: blur(4px)` für modernen Glaseffekt
- Scale-In Animation für die Modal-Karte (`transform: scale(0.95) → scale(1)`)

---

## 9. Slider-Styling (GameSetup) cross-browser

**Problem:** Slider hat nur `-webkit-slider-thumb` und `-moz-range-thumb`. Der Track-Style fehlt für Firefox (`-moz-range-track`).

**Plan:** Firefox-Track-Style ergänzen für konsistentes Erscheinungsbild.

---

## 10. Header PK-Anzeige aufwerten

**Problem:** Die PK-Anzeige (Politisches Kapital) ist nur ein Text-Span — für eine so zentrale Spielressource zu unauffällig.

**Plan:**
- Badge-Style mit Hintergrund und leichtem Glow
- Animierte Zahl-Transition bei Änderung (CSS `transition` auf color bei Änderung)

---

## 11. Scrollbar-Styling für alle Browser

**Problem:** Nur `::-webkit-scrollbar` ist gestylt. Firefox (`scrollbar-color`, `scrollbar-width`) fehlt.

**Plan:** Firefox-Scrollbar-Properties in `global.css` ergänzen.

---

## 12. WahlnachtOnboarding — Beat-Transitionen

**Problem:** Beats wechseln hart (kein Übergang zwischen Beat 1→2→3→4). Nur der initiale Inhalt hat fadeIn.

**Plan:** Jeder Beat-Container bekommt eine eigene `fadeIn`-Animation für sanftere Übergänge.

---

## 13. Theme-Picker (Setup) — Visuelle Klarheit

**Problem:** Die Swatch-Vorschau (14px-Kreise) ist sehr klein. Der aktive Zustand hat nur `box-shadow: 0 0 0 1px` — dezent aber schwer erkennbar.

**Plan:**
- Swatches vergrößern (18px)
- Aktiver State: dickerer Ring (2px) + leichter Glow
- Hover: Name in Gold-Farbe

---

## 14. Wahlprognose (LeftPanel) — Visuelles Gewicht

**Problem:** Die große 32px-Zahl steht isoliert ohne visuelle Einbettung.

**Plan:**
- Farbcodierung der Zahl basierend auf Zielwert (grün wenn > Threshold, rot wenn <)
- Subtiler Hintergrund-Container für den Prognose-Block

---

---

## Umsetzungsreihenfolge (priorisiert)

| Prio | Schritt | Aufwand | Dateien |
|------|---------|---------|---------|
| 1 | Focus-States (Accessibility) | Klein | `global.css` |
| 2 | Keyframe-Duplikate konsolidieren | Klein | `global.css` + 4 Screen-CSS |
| 3 | Button-Styles konsolidieren | Mittel | `global.css` + 5 Screen/Component-CSS |
| 4 | Einheiten px vereinheitlichen | Mittel | 3 Component-CSS |
| 5 | Modal Backdrop & Animation | Klein | 2 Overlay-CSS |
| 6 | Hover-States verbessern | Klein | 5+ CSS-Dateien |
| 7 | Toast Fade-Out | Klein | `Toast.module.css` + `Toast.tsx` |
| 8 | Firefox Scrollbar + Slider | Klein | `global.css` + `GameSetup.module.css` |
| 9 | EndScreen aufwerten | Mittel | `EndScreen.module.css` |
| 10 | Header PK Badge | Klein | `Header.module.css` |
| 11 | WahlnachtOnboarding Transitions | Klein | `WahlnachtOnboarding.module.css` |
| 12 | Theme-Picker Verbesserung | Klein | `Setup.module.css` |
| 13 | Wahlprognose Farbcodierung | Klein | `LeftPanel.module.css` + `LeftPanel.tsx` |
| 14 | Stagger-Animations | Klein | Diverse CSS |
