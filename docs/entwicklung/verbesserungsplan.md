# Verbesserungsplan: Inkonsistenzen, Spielbarkeit, Balancing

Ergebnis einer systematischen Inspektion des Spiels (Juni 2026) in drei Dimensionen:
Spiellogik/Balancing, UI/Spielbarkeit und Konsistenz zwischen Design-Dokument und
Implementierung. Priorisierte Liste aller Befunde mit Status.

**Legende:** ✅ umgesetzt · ⬜ offen · ❎ geprüft, kein Handlungsbedarf (False Positive)

---

## P0 — Bugs & Konsistenz

| Status | Befund | Details |
|--------|--------|---------|
| ✅ | **Milieu→Segment-Mapping 6-fach dupliziert, 1× abweichend** | `MILIEU_TO_ZUST` existierte in `state.ts`, `wahlprognose.ts`, `milieus.ts`, `koalition.ts`, `MediaView.tsx`, `MilieuSidebar.tsx`. In `koalition.ts` fehlten 5 von 7 Milieus und `soziale_mitte` zeigte fälschlich auf `mitte` — der Milieu-Alarm des Koalitionspartners arbeitete dadurch mit dem Default 50. Jetzt eine Quelle in `core/constants.ts`. |
| ✅ | **Wahlhürden dreifach inkonsistent** | `gameStore` hatte 35/38/40/42 je Stufe, `DEFAULT_ELECTION_THRESHOLD` war 45, verstreute Fallbacks nutzten 40. Jetzt zentral: `ELECTION_THRESHOLDS_BY_COMPLEXITY` + `DEFAULT_ELECTION_THRESHOLD = 40`. |
| ✅ | **Balance-Sim testete mit unrealistischer Hürde** | `balanceSim.ts` setzte hart `electionThreshold: 35` bei Komplexität 4 (real: 42). Jetzt wird die reale Hürde der simulierten Stufe verwendet. |
| ✅ | **Toter Code: `updateCoalition()`** | Ungenutzte Funktion in `characters.ts` mit abweichender Stabilitätsformel (mood/loyalty 50/50 statt 35/35/30) — entfernt. |
| ❎ | Followup-Referenz `verfassungsklage_schulden` angeblich kaputt | Geprüft: Alle 5 Followup-Ziele sind in `backend/app/content/events/random.yaml` definiert, Events werden direkt aus dem YAML serviert, die Followup-Infrastruktur (Frontend `events.ts`, DB-Spalte, Feature-Flag Stufe 4) existiert vollständig. Keine Duplikate, keine kaputten Referenzen. |
| ❎ | Koalitionsvertrag-Score angeblich unbegrenzt | Geprüft: Alle Mutationen clampen auf [0,100]; Semantik (Score = Konflikt-Maß, −2/Monat = Deeskalation) ist konsistent. |

## P1 — Balancing

Alle Änderungen wurden per Monte-Carlo-Simulation kalibriert (200 Runs/Strategie,
Komplexität 4, reale Wahlhürde 42 %). Details: [Balance-Simulation](balance-simulation.md).

| Status | Befund | Details |
|--------|--------|---------|
| ✅ | **Zufriedenheits-Abwärtsspirale** | Unbedingter ZF-Verfall von −0,38/Monat (≈ −18 über 48 Monate) machte das Spätspiel mechanisch immer schwerer. Jetzt −0,25/Monat plus milde Erholung (+0,15) unter ZF 35. |
| ✅ | **Fiskalpolitik dominierte Sozialpolitik ~5×** | Segment `mitte` gewichtete den Haushalt mit Faktor 3,0 (zusätzlich zu 2,5 in der Basisformel). Jetzt 1,0; GI-Baseline vereinheitlicht (30 statt 28/30 gemischt); ZF-Gewicht für `prog` von 0,15 auf 0,3 angehoben. |
| ✅ | **Spielziel trivial erreichbar** | Komplette Passivität erreichte 45 ≥ 40 Punkte („gewonnen“), weil das historische Urteil ohne Gesetze neutral (50) ausfiel. Jetzt `URTEIL_OHNE_GESETZE = 25`. Ergebnis: passive Strategien 0 % Gewinnrate, aktive 94–100 %. |
| ✅ | **Charakter-Boni inkonsistent / teils wirkungslos** | Umweltminister-Bonus (`zust.prog +0,3`) wurde von `recalcApproval` im selben Tick überschrieben — komplett wirkungslos. Wirtschaftsminister-Bonus war zufallsbasiert (30 %), andere deterministisch. Jetzt einheitlich: deterministischer KPI-Bonus (`CHAR_KPI_BONUS`) bei Mood ≥ 4; Innenminister hat neben der Sabotage (Mood ≤ 1) jetzt ein Upside (halbierte Skandal-Chance bei Mood ≥ 4). |
| ✅ | **KPI-Drift-Parameter verstreut** | Chancen/Biases/Magnituden waren Magic Numbers in `economy.ts` — jetzt benannte Konstanten in `core/constants.ts`. |
| ✅ | **Balance-Tests zu lasch** | Assertions „Gewinnrate ≥ 20 %“ waren trivial erfüllt (alle Strategien 100 %). Jetzt: beste Strategien > 50 %, Passivität < 50 %, Hürden-Differenzierung aktiv vs. passiv. |

**Messwerte vor/nach (Anteil Runs über der Wahlhürde 42 %, Komplexität 4):**

| Strategie | vorher | nachher |
|-----------|-------:|--------:|
| wahlkaempfer (aktiv) | 95 % | 100 % |
| musterschueler (aktiv) | 56 % | 96 % |
| allrounder (aktiv) | 20 % | 75 % |
| random | 14 % | 46 % |
| pk_horten (passiv) | 10 % | 39 % |
| medienmogul (passiv) | 0 % | 1 % |

## P2 — Spielbarkeit / UX

| Status | Befund | Details |
|--------|--------|---------|
| ✅ | **Kein Einstieg ins Spiel-Layout** | Neue `IntroTour`: 5-Schritte-Einführung beim ersten Spiel (Ziel/Wahlhürde, Gesetze, PK, Zeitsteuerung, Hilfe) — einmalig, überspringbar, de/en. Ergänzt die bestehenden kontextuellen `GameTips`. |
| ✅ | **Shortcut-Hilfe nicht auffindbar** | Das Tastaturkürzel-Modal war nur über die ?-Taste erreichbar. Jetzt zusätzlich ⌨-Button im Header. |
| ✅ | **Autosave scheitert still** | Bei vollem/blockiertem localStorage ging Fortschritt kommentarlos verloren. Jetzt Warn-Toast (einmal pro Sitzung). |
| ✅ | **Speicher-Modell unklar** | `SaveHintBanner` suggerierte, ohne Login werde gar nicht gespeichert. Text stellt jetzt klar: lokal im Browser automatisch, Cloud nach Login. |
| ✅ | **Settings-Button kommentarlos disabled** | Jetzt „(Bald verfügbar)“ + Tooltip + `aria-label`. |
| ✅ | **Content-Fehler ohne Recovery in GameView** | Nutzt jetzt `ErrorScreen` (mit Retry) und `LoadingScreen` statt ungestylter Inline-Divs. App-Ebene hatte bereits Retry. |
| ❎ | Event-Choices ohne Begründung disabled | Geprüft: `EventCard` hat bereits einen Tooltip mit PK-Begründung (`eventCard.nichtGenugPk`). |
| ❎ | Tote Speed-Shortcuts (2/3) | Geprüft: 3×-Geschwindigkeit wurde bewusst entfernt (PR #204); Handler und UI sind konsistent (nur Pause/1×). |
| ⬜ | Vollwertiges interaktives Tutorial (Spotlight auf UI-Elemente, geführte erste Aktionen) | Bewusst nicht in diesem Schritt — IntroTour deckt die Grundlagen ab. |
| ⬜ | Mobile-Breakpoint < 768 px, Touch-Targets, Karten auf Kleingeräten | Tablet-Layout (≤ 1024 px) existiert; echtes Phone-Layout ist ein eigenes Projekt. |
| ⬜ | KPI-Warnzonen (z. B. AL > 8 % rot) und Mini-Historie in den Tiles | KPI-Tiles haben Trend-Pfeile + Tick-Log-Begründungen; Warnzonen wären der nächste Schritt. |
| ⬜ | Playtest-Sperrung der Stufen 2–3 (`config/playtest.ts`) | Bewusste Playtest-Entscheidung des Teams (SMA-332) — nicht eigenmächtig geändert. Vor Release `gesperrte_stufen: []` und `playtest_modus: false` setzen! |

## P3 — i18n & Content

| Status | Befund | Details |
|--------|--------|---------|
| ✅ | **Glossar nur deutsch** | 32 Fachbegriffe (`Erklaerung`-Tooltips) waren hartcodiert deutsch in `constants/begriffe.ts` — englische Spieler sahen deutsche Tooltips. Jetzt lokalisiert unter `game:begriffe.*` (de + en). |
| ✅ | **Hartcodierte deutsche Fehlertexte** | `api.ts` (Netzwerk/Parse), `ErrorBoundary`-Fallback → `common:errors.*` (de + en). |
| ✅ | **Fehlende i18n-Keys unsichtbar** | `parseMissingKeyHandler` gab still `''` zurück. Im Dev-Modus wird jetzt geloggt und der Key angezeigt. |
| ⬜ | **EN-Übersetzungen für Gesetze/Events ab Migration 006** | Nur die 4 MVP-Gesetze haben EN-Übersetzungen (Migration 003); ~140 weitere fallen per `LOCALE_FALLBACK` auf Deutsch zurück. Großer Content-Task — EN sollte bis dahin als „experimentell“ kommuniziert werden. |
| ⬜ | Gebündelte Frontend-Defaults (Medien-/Bundesrat-Events) in DB seeden | Funktionierender Fallback, aber zweite Quelle der Wahrheit mit Drift-Risiko. |
| ⬜ | JSON-Schema-Validierung für JSONB-Content (`framing_optionen`, `lobby_mood_effekte`) | Aktuell keine Compile-Time-Sicherheit zwischen Backend-JSONB und Frontend-Typen. |

## P4 — Doku & Prozess

| Status | Befund | Details |
|--------|--------|---------|
| ✅ | GDD/Docs veraltet: 3×-Geschwindigkeit | 3× wurde im Spiel entfernt (PR #204), stand aber noch in GDD und `core-loop.md`. |
| ✅ | GDD: Lose-Bedingung fix „40 %“ statt stufenabhängiger Hürde | Korrigiert; Win-Bedingung verweist jetzt auch auf das dreistufige Spielziel. |
| ⬜ | Tick-Order-Validierungstest | Die Reihenfolge der ~20 Subsysteme in `engine.tick()` ist kritisch dokumentiert, aber nur durch Integrationstests abgedeckt. |
| ⬜ | Balance-Sim: Assertions für Median-Game-Over-Monat und Strategie-Dominanz | Grundlage (Messskript-Muster) existiert in `balanceSim.test.ts`. |
