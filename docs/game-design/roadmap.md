# Roadmap (Design ↔ Implementierung)

Diese Roadmap beschreibt den **aktuellen Implementierungsstand** und die **nächsten Ausbauschritte**. Viele Systeme sind bereits vorhanden, werden aber je nach **Komplexitätsstufe** stufenweise sichtbar/aktiv (Progressive Disclosure über `featureActive(...)` in `frontend/src/core/systems/features.ts`).

---

## Done (implementiert, iterativ verfeinert)

### Core Engine & Spielrhythmus
- Tick-System (Monatslogik), Pause, Geschwindigkeit, Auto-Pause bei Events
- KPI-System inkl. **Wirkungslatenz** (Lag) und Monats-Bilanz/Log
- Spielende/Wahl-Logik inkl. kompexitätsabhängiger Wahlhürde

### Gesetzgebung & Mehr-Ebenen-Mechanik
- Gesetz-Lebenszyklus: Entwurf → Einbringen/Ausschuss-Lag → BT-Abstimmung → (ggf.) Bundesrat/Vermittlung → beschlossen/blockiert
- Ausweichrouten bei Blockade (EU/Land/Kommune) inkl. Fortschritt/Timing
- Vorstufen/Projekte, Gegenfinanzierung/Kongruenz-Checks (stufenweise)

### Politik-Akteure (Kabinett/Koalition/Fraktionen)
- Dynamisches Kabinett, Kanzlerprofil (Name/Geschlecht für Anrede)
- Koalitionspartner, Stabilität, Prioritäten, Widerstände/Vetos (stufenweise)
- Charakter-Events/Ultimaten und ministerielle Initiativen (stufenweise)

### Bundesrat & Föderalismus
- Bundesrat-Ansicht ab Stufe 2, vertiefte Interaktion (Lobbying/Trade-offs/Beziehungen) ab höheren Stufen
- Vermittlungsausschuss-Mechanik, Einspruch vs. Zustimmungsgesetz (stufenweise)
- Normenkontrolle/Verfassungs-Mechaniken (stufenweise)

### EU, Haushalt, Wirtschaft, Medien, Wahlkampf
- EU-Route (3 Phasen), EU-Klima, Ratsvorsitz/Inhalte (stufenweise)
- Haushalt (Konjunktur, Schuldenbremse, Debatten, Steuerquote, Dashboard) + Wirtschaftsindikatoren/Charts (stufenweise)
- Medienklima/-akteure, Framing, Presse-/Skandal-/Oppositionsmechaniken (stufenweise)
- Wahlkampf, TV-Duell, Legislaturbilanz, Wahlnacht-Analyse (stufenweise)
- Follow-up-/Eventketten (u. a. ab Stufe 4)

### App-Shell, Speicherung, i18n
- React/Vite-App-Shell, Routing, i18n (de/en)
- Spielstart/Onboarding (Wahlnacht) und Speicherstände: localStorage + optional Cloud-Saves (API `/api/saves`)

---

## Next (nächste Iterationen, 1–2 Milestones)

### Stabilität, UX und „Spielbarkeit“
- Mehr **Polish**: klarere Feedbackschleifen (warum Zustimmung/Abstimmungen kippen), bessere Tooltips/Erklärungen je Stufe
- Balancing: kontinuierliche Simulation/Regression gegen Content-Änderungen (siehe CI Balance-Check)
- Performance: Tick-/UI-Hotspots identifizieren (insb. Charts/Listen) und glätten

### Content-Ausbau ohne neue Kern-Engine
- Mehr Gesetze, Events, Sprechertexte, Follow-ups (DE/EN) – Fokus: Varianz pro Legislatur
- Mehr Szenario-Varianten (Startsituationen, Koalitionslagen) als Content-Pakete

### Dev/Modding-Flows (wenn gewünscht)
- Klarere „Content-Authoring“-Guides (Schemas, Validierung, typische Fehlerbilder)
- Tooling für Content-Tests (z. B. schnelle Validierung + Smoke-Run)

---

## Later (v1.0 / größere Optionen)

- Koalitionsverhandlungs-Minispiel beim Start (optional/vertieft)
- Zweite Legislaturperiode mit Szenario-Kontinuität (Meta-Progression)
- Historische Szenarien (z. B. Finanzkrise/Corona/…)
- Audio/Sound-Design (Ambient, UI-Feedback)
- Achievements/Meta-Fortschritt (nur wenn es die Kernfantasie stärkt)
- Veröffentlichung (z. B. itch.io) inkl. Marketing-/Release-Checkliste
