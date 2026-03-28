# Entwicklungs-Roadmap

Stand der Liste: an die **laufende Implementierung** in `frontend/src/core/` und `frontend/src/store/` angeglichen. Release-Labels (v0.x) beschreiben Meilensteine; viele Systeme sind bereits über mehrere Stufen verteilt umgesetzt.

---

## v0.1 — Skeleton (fertig)

- Tick-System, Pause, Geschwindigkeit, Auto-Pause bei Events
- Gesetze, Bundestagslogik (inkl. Eingebracht-/Ausschussphase, Stufe 1: kurzes Lag)
- KPI-System mit Wirkungs-Lag
- Basis-Wahl / Spielende (Wahlhürde abhängig von Komplexitätsstufe)

---

## v0.2 — Narrativ & Shell (fertig)

- Charakter-System, Events mit Pressezitat und Entscheidungen
- Progressive Disclosure über Komplexitätsstufen (`featureActive` in `frontend/src/core/systems/features.ts`)
- Milieu-System (Umfang und UI stufenweise)
- **App-Shell:** React/Vite, Routing, i18n (de/en)
- **Hauptmenü, Spielstart (`GameSetup`), Wahlnacht-Onboarding** (`WahlnachtOnboarding` / `WahlnachtScreen`)
- **Spielstand:** `localStorage` + optional **Cloud-Slots** (API `/api/saves`, Login)

---

## v0.3 — Kabinett, Koalition, erweiterte Politik (fertig)

- Dynamisches Kabinett aus Parteipools, Spieler als Kanzler/in (Name, Geschlecht für Anrede)
- Spielbare Parteien, Koalitionspartner, Koalitionsvertrag-Tracking (Score/Profil, stufenweise)
- Char-Ultimatums, Koalitionsstabilität, Minister-Agenden / Initiativen (stufenweise)
- Verbände, Politikfeld-Druck, Kongruenz/Gegenfinanzierung beim Einbringen (stufenweise)
- Fraktionsdisziplin, Ideologie-Einfluss auf BT, Partner-Widerstand (stufenweise)

---

## v0.4 — Bundesrat & Föderalismus (fertig, iterativ verbessert)

- Bundesrat-Tab stufenweise (sichtbar ab Stufe 2, Detail/Lobbying/Trade-offs ab Stufe 3)
- Länderliste, bilaterale Landesgespräche (ab Stufe 3)
- Fraktionsmodell, Beziehungen, Lobbying-Fenster, Events (Content-gesteuert)
- Vermittlungsausschuss, Einspruch vs. Zustimmungsgesetz (stufenweise)
- Normenkontrolle / Verfassungsgericht (stufenweise)

---

## v0.5 — EU, Ebenen, Haushalt, Medien, Wahlkampf (überwiegend fertig)

- EU-Route (3 Phasen), EU-Klima, reaktive EU-Inhalte, Ratsvorsitz (stufenweise)
- Ausweichrouten Kommune/Land/EU, Gesetz-Vorstufen, Agenda-Ansichten
- Haushalt: Konjunktur, Schuldenbremse, Haushaltsdebatte, Steuerquote/Dashboard (stufenweise)
- **Wirtschaftssektoren**, Makroindikatoren, Charts im Haushalt (stufenweise)
- Medienklima, Medienakteure, Framing, Pressemitteilung, Skandale, Opposition (stufenweise)
- Wahlkampf, TV-Duell, Legislatur-Bilanz, Wahlnacht-Analyse (stufenweise)
- Regierungserklärung, Vertrauensfrage, konstruktives Misstrauensvotum (stufenweise)
- Dynamische / Follow-up-Events (u. a. ab Stufe 4)

---

## v0.6 — Geplant / Ausbau

- Koalitionsverhandlungs-Minispiel beim Start (vertieft, optional)
- Zweite Legislaturperiode mit Szenario-Kontinuität
- Historische Szenarien (Wiedervereinigung, Finanzkrise, Corona, …)
- Erweiterter Content (Events, Gesetze) ohne neue Kern-Engine

---

## v1.0 — Release-Ziel

- Optional: 16 MP-Charaktere statt/ergänzend zum Fraktionsmodell (falls gewünscht)
- Sound-Design (Ambient, UI-Feedback)
- Onboarding-Tutorial nur falls nötig (Design: „narratives“ Onboarding besteht)
- Mehrere Startszenarien, ggf. Achievements / Meta-Fortschritt
- itch.io-Release
