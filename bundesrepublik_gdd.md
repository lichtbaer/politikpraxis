# Bundesrepublik — Game Design Document
**Version 0.4 · Stand: März 2026**

---

## 1. Konzept & Vision

### 1.1 Elevator Pitch

Bundesrepublik ist eine browserbasierte Echtzeit-Politiksimulation mit Pause. Der Spieler führt eine Bundesregierung durch eine 4-jährige Legislaturperiode, bringt Gesetze durch ein mehrstufiges politisches System und muss dabei Kabinettsmitglieder, Koalitionspartner, Bundesrat, EU-Ebene und Kommunen gleichzeitig managen — mit dem Ziel: Wiederwahl.

### 1.2 Designziel

Das Spiel soll *gespielt* werden, nicht studiert. Komplexität entsteht durch dramatische Situationen, nicht durch Zahlentabellen. Jede mechanische Tiefe — Wirtschaftsindikatoren, Bundesrat-Mehrheiten, EU-Richtlinien — wird durch Charaktere, Narrative und Event-Cards vermittelt. Die Oberfläche zeigt Drama, die Tiefe öffnet sich auf Abruf.

**Vergleichbare Spiele:** Crusader Kings III (Charakterdrama + Systemtiefe), Democracy 4 (Policy-Kausalitäten), 80 Days (narrative Entscheidungsketten), Suzerain (politische Moral-Dilemmas).

### 1.3 Alleinstellungsmerkmal: Multilevel Governance

Das zentrale spielerische Konzept ist der **Ebenenwechsel als Ausweichstrategie**. Scheitert ein Vorhaben auf der Bundesebene (Bundestag, Bundesrat), wechselt der Spieler die politische Ebene:

- **EU-Ebene**: Lobbyismus für eine EU-Richtlinie, die nationales Recht überrollt — langsam, teuer, unkontrollierbar
- **Länderebene**: Kooperationswillige Bundesländer als Piloten voranlaufen lassen — setzt Präzedenz
- **Kommunalebene**: Städtebündnisse als bottom-up Druck — günstig, langsam, lokale Reichweite

Dieses Konzept ist politikwissenschaftlich präzise (Multilevel Governance) und spielerisch einzigartig — es gibt kein vergleichbares kommerzielles Spiel das diesen Mechanismus implementiert.

---

## 2. Core Loop

```
Agenda setzen
    ↓
Koalition pflegen / Charaktere managen
    ↓
Gesetz einbringen → Abstimmung
    ↓
Erfolg: Effekte mit Lag (3–8 Monate)
Scheitern: Ebenenwechsel wählen
    ↓
Random Events reagieren (pausieren Spiel, fordern Entscheidung)
    ↓
Monat +1
    ↓
Monat 48: Wahl → Wiederwahl ≥ 40%?
```

**Zeitstruktur:** Echtzeit mit Pause. 1 Spieltick = 1 Monat. Geschwindigkeiten: Pause / 1× (1,8 Sek/Monat) / 3× (0,6 Sek/Monat). Events pausieren automatisch.

**Win-Bedingung:** ≥ 40% Wahlzustimmung in Monat 48.

**Lose-Bedingungen:** Wahlzustimmung unter 40% bei Wahl, oder Koalitionsbruch (Stabilitätswert < 15%).

---

## 3. Spielsysteme

### 3.1 Politisches Kapital (PK)

Die zentrale Ressource. Jede Aktion kostet PK. Regeneration: +1–6 PK/Monat abhängig von Gesamtzustimmung.

| Aktion | Kosten |
|--------|--------|
| Gesetz einbringen (Bundestag) | 20 PK |
| Lobbying (BT-Stimmen verbessern) | 12 PK |
| Koalitionsarbeit mit Partner | 12 PK |
| Medienkampagne (Milieu) | 10 PK |
| Länder-Lobbying (einzelner MP) | 15 PK |
| EU-Lobbyismus starten | 28 PK |
| Länder-Pilot starten | 18 PK |
| Städtebündnis starten | 10 PK |

PK-Maximum: 150. Spieler beginnen mit 100.

---

### 3.2 Kabinett & Charaktersystem

6 Kabinettsmitglieder mit aktiver Spielmechanik. Jeder Charakter hat:

- **Stimmung** (0–4, Emoji-Anzeige: 😠 😟 😐 🙂 😊)
- **Loyalität** (0–5, Balken-Anzeige)
- **Eigeninteressen** (2–3 Themen die ihr Verhalten steuern)
- **Passiv-Bonus** (aktiv bei Stimmung ≥ 3–4)
- **Ultimatum-Schwelle** (Mood-Wert bei dem ein Forderungs-Event ausgelöst wird)

**Aktuelle Charaktere (MVP):**

| Name | Rolle | Interesse | Bonus | Ultimatum |
|------|-------|-----------|-------|-----------|
| Anna Hoffmann | Kanzlerin | Koalitionsstabilität, Wiederwahl | +5 BT-Stimmen alle Gesetze (Mood ≥ 3) | Mood ≤ 1: Vertrauensfrage |
| Robert Lehmann | Finanzminister | Haushaltsdisziplin, Schuldenbremse | Verhindert neg. Haushaltsdrift (Mood ≥ 4) | Mood ≤ 0: Haushalt-Ultimatum |
| Petra Maier | Wirtschaftsministerin | Standortpolitik, Industrietransformation | AL sinkt passiv (Mood ≥ 4, 30% Chance/Monat) | Mood ≤ 0: Standort-Ultimatum |
| Klaus Braun | Innenminister | Innere Sicherheit, Migration | 3 Bundesrat-Länder stabilisiert (Mood ≥ 4) | Mood ≤ 0: Sabotage Bundesrat (passiv wenn Mood ≤ 1) |
| Sara Kern | Justizministerin | Rechtsstaat, Grundrechte | Verhindert Verfassungsklagen (Mood ≥ 3) | Mood ≤ 1: Verfassungs-Blockade |
| Jonas Wolf | Umweltminister | Klimaschutz, Energiewende | Progressives Milieu +0,3%/Monat (Mood ≥ 4) | Mood ≤ 1: Klima-Ultimatum |

**Braun-Sonderregel:** Bei Mood ≤ 1 sabotiert Braun passiv BT-Abstimmungen — 30% Chance/Monat, zufällige aktive Gesetze verlieren 1% Zustimmung.

**Koalitionsstabilität:** Gewichteter Durchschnitt aus allen Char-Stimmungen und Loyalitäten. Sichtbar als Balken. Unter 30%: Koalitionskrise-Event. Unter 15%: Koalitionsbruch = Spielende.

---

### 3.3 Gesetzgebungssystem

**Gesetz-Lebenszyklus:**

```
Entwurf → Aktiv (BT) → Abstimmung → Beschlossen
                                   → Blockiert → Ebenenwechsel
```

**Bundestagsabstimmung:** Benötigt > 50% Ja-Stimmen. Basis-Ja-Quote je Gesetz, verbessert durch Lobbying und Koalitionsarbeit.

**Bundesratsabstimmung:** Nur für Gesetze mit `land`-Tag. Vereinfacht: 5 Blöcke (Koalitionsländer / Neutral / Opposition). Koalition hat 5/16 Länder (31%) — braucht Lobbying für Mehrheit.

**Wirkungslatenz (Lag):** Beschlossene Gesetze entfalten Wirkung erst nach 4–8 Monaten. Erzeugt realistische Entkopplung zwischen Handeln und Feedback.

**Vorhandene Gesetzentwürfe (MVP):**

| Gesetz | Tags | BT-Start | Effekte | Lag |
|--------|------|----------|---------|-----|
| EE-Beschleunigungsgesetz | bund, eu | 48% Ja | HH -0.4, ZF +5, GI -0.5, AL -0.3 | 4 Mo |
| Bundeswohnungsbauoffensive | bund, land, kommune | 55% Ja | HH -0.6, ZF +8, GI -1.2, AL -0.5 | 6 Mo |
| Unternehmenssteuerreform | bund, eu | 51% Ja | HH -0.2, ZF +3, GI +1.5, AL -0.8 | 5 Mo |
| Nationales Bildungspaket | land, bund | 53% Ja | HH -0.5, ZF +6, GI -0.8, AL -0.1 | 8 Mo |

---

### 3.4 Ebenenmechanik (Kernfeature)

Bei Blockade öffnen sich drei Ausweichrouten:

**EU-Lobbyismus** (28 PK, 8 Monate)
- Richtlinie in Brüssel anstoßen
- Risiko: EU macht daraus etwas anderes
- Vorteil: überrollt Bundesrat komplett
- Zugehörige Ebene: EU-Panel mit aktivem Fortschrittsbalken

**Länder-Pilot** (18 PK, 5 Monate)
- Kooperationswillige Länder voranschicken
- Setzt politischen Präzedenzfall
- Benötigt: Koalitionsländer verfügbar
- Stärkt Druck auf blockierende Länder

**Städtebündnis** (10 PK, 4 Monate)
- Bottom-up Druck über Kommunen
- Günstigste und schnellste Route
- Begrenzte nationale Reichweite
- Ideal für Experimentierräume

Alle Routen laufen als Fortschrittsbalken sichtbar auf den Ebenen-Panels. Mehrere Routen können parallel laufen.

---

### 3.5 Wirtschaftssystem (4 KPIs)

| KPI | Startw. | Bereich | Richtung | Einfluss auf Zustimmung |
|-----|---------|---------|----------|-------------------------|
| Arbeitslosigkeit | 5,2% | 2–15% | niedriger = besser | Arbeit-Milieu stark |
| Haushaltssaldo | +0,3% | -3–+2% BIP | höher = besser | Mitte-Milieu stark |
| Gini-Index | 31,2 | 20–45 | niedriger = besser | Progressiv-Milieu mittel |
| Zufriedenheitsindex | 62% | 0–100% | höher = besser | alle Milieus |

**Zustimmungsformel:**
```
Gesamt = 30 + (10 - AL) × 1.3 + HH × 2.5 + (50 - Gini) × 0.25 + (ZF - 50) × 0.4
```

**Milieu-Gewichtung:**
- Arbeit: Zustimmung + (10-AL) × 1.5 - (Gini-30) × 0.4
- Mitte: Zustimmung + HH × 3
- Progressiv: Zustimmung - (Gini-28) × 0.5 + (ZF-50) × 0.15

---

### 3.6 Event-System

Events sind das spielerische Herz. Sie erscheinen zufällig (~22% Chance/Monat), pausieren das Spiel und fordern eine Entscheidung.

**Event-Card Aufbau:**
1. Icon + Typ-Label + Titel
2. Fiktives Pressezitat (Serif-Kursiv)
3. Kontext-Satz (2–3 Zeilen)
4. 2–3 Antwortoptionen mit Label, Beschreibung, Kosten

**Zwei Event-Typen:**

*Random Events* (aus Pool, max. 1× pro Spieldurchlauf):
- Haushaltsloch
- Ministeriumsskandal
- EU-Vertragsverletzungsverfahren
- Konjunkturabschwung
- Koalitionskrise
- Großdemonstration
- EU-Strukturfonds-Freigabe
- Verfassungsgerichtsurteil (geplant)
- Naturkatastrophe (geplant)
- Cyberangriff auf Behörden (geplant)
- G7-Gipfel / internationale Krise (geplant)
- Whistleblower-Affäre (geplant)
- Streikwelle (geplant)
- Wohnungsnot-Proteste (geplant)
- Rechtsextremismus-Krise (geplant)

*Char-Ultimatums* (ausgelöst bei Mood-Schwelle):
- Lehmann: Haushalt-Ultimatum
- Braun: Bundesrat-Sabotage
- Wolf: Klima-Ultimatum
- Kern: Verfassungs-Blockade
- Hoffmann: Vertrauensfrage
- Maier: Standort-Ultimatum

**Folge-Events (geplant):** Manche Entscheidungen öffnen einen Folge-Event im nächsten oder übernächsten Monat. Beispiel: Schulden aufnehmen → Monat +2: Verfassungsklage.

---

### 3.7 Bundesrat-System (in Entwicklung)

**Ziel:** Bundesrat als eigene Spielebene mit 16 Ministerpräsidenten als Charakteren.

**Konzept:**
- 16 Länder als klickbare Kacheln, farblich nach Regierungspartei
- Jedes Land hat einen MP-Charakter mit Namen, Partei, Stimmung, Interesse
- Vor wichtigen Abstimmungen: Länder-Lobbying möglich (15 PK, einzelner MP)
- Länder können durch Events kippen (Landtagswahl-Events)
- Bundesrat-Mehrheit dynamisch, kein fixer Würfelwurf

**Bundesrat-Konfiguration (Start):**
- Koalitionsländer (5): BY, NW, BW, NI, HE
- Neutral (6): HH, HB, BE, SH, SL, RP
- Opposition (5): BB, SN, TH, MV, ST

**Geplante MP-Charaktere (Auswahl):**
- Bayern: Edmund Huber (CSU) — Wirtschaftsorientiert, EU-skeptisch
- NRW: Claudia Bergmann (SPD) — Industriepolitik, Kohlephase
- Berlin: Kai Neumann (Grüne) — Klimaschutz, Urbanisierung
- Sachsen: Matthias Kohl (CDU) — Migration, Strukturwandel

---

### 3.8 Mediensystem (einfach)

**Drei Wählermilieus:**
- Arbeit (Fokus: Beschäftigung, Löhne, soziale Sicherheit)
- Mitte (Fokus: Haushalt, Stabilität, Verlässlichkeit)
- Progressiv (Fokus: Klima, Gerechtigkeit, Modernisierung)

**Medienkampagne (10 PK):** +2–5% Zustimmung im Zielmilieu. Einmalig, keine Abklingzeit.

**Ticker:** Laufender Nachrichtentext oben im Center-Panel. Aktualisiert bei Events und wichtigen Entscheidungen.

**Geplant:** Medien-Agenda — Spieler kann Pressekonferenz einberufen (Risiko/Chance-System), Leitmedien haben eigene politische Tendenz und verstärken/dämpfen Events.

---

## 4. UI-Architektur

### 4.1 Layout (3-Spalten)

```
┌─────────────────────────────────────────────────────────┐
│  HEADER: Titel · Monat/Jahr · Geschwindigkeit · PK      │
├──────────────┬──────────────────────┬───────────────────┤
│ LEFT (260px) │  CENTER (flex)       │ RIGHT (300px)     │
│              │                      │                   │
│ Wahlprognose │ Ticker               │ Wirtschafts-KPIs  │
│ Milieu-Bars  │ ────────────────     │ (4 Kacheln)       │
│ Koalitions-  │ Event-Stage:         │                   │
│ stabilität   │  - Event-Card ODER   │ Ereignisprotokoll │
│              │  - Agenda-View       │ (scrollbar)       │
│ Kabinett     │  - EU/Land/Kom-View  │                   │
│ (6 Chars)    │  - Medien-View       │                   │
│              │                      │                   │
│ Ebenen-Nav   │                      │                   │
└──────────────┴──────────────────────┴───────────────────┘
```

### 4.2 Progressive Disclosure

**Sichtbar immer:**
- Wahlprognose % + Milieu-Bars
- Koalitionsstabilität-Balken
- Kabinett-Char-Reihe (Initialen + Mood-Emoji)
- Aktives Event (wenn vorhanden) ODER Agenda-Liste
- Wirtschafts-KPIs (4 Kacheln, kompakt)

**1 Klick tief:**
- Char-Detail (Overlay mit Bio, Bonus, Warnung)
- Gesetz expandiert (Stimmenbalken, Aktionen, Ausweich-Panel)
- Ebenen-Views (EU/Land/Kommune/Medien)

**Nie automatisch sichtbar:**
- Bundesrat-Konfiguration
- Einzelne KPI-Historien
- Detaillierte Effekt-Berechnungen

### 4.3 Aesthetic

- **Stil:** Politisches Nachrichtenmagazin meets Strategiespiel
- **Schriften:** Playfair Display (Serif, für Titel/Zitate), DM Sans (UI), DM Mono (Zahlen/Codes)
- **Farben:** Dunkle Erdtöne (#1a1712 Hintergrund), Gold-Akzente (#c8a84a), semantische Statusfarben
- **Event-Cards:** Serif-Kursiv für Pressezitate, farbige Rand-Akzente nach Event-Typ
- **Ziel:** Fühlt sich wie ein hochwertig produziertes Tablet-Spiel an, nicht wie ein Verwaltungstool

---

## 5. Technischer Stack

### 5.1 Aktuell (MVP)
- **Single HTML File** — alles in einer Datei, kein Build-System, kein Framework
- Vanilla JavaScript (ES2020+)
- Google Fonts (Playfair Display, DM Sans, DM Mono)
- Keine externen Abhängigkeiten

### 5.2 Dateistruktur (geplant für v1.0)
```
/bundesrepublik
  index.html
  /js
    engine.js         ← Tick-System, Event-Bus, Zeit
    state.js          ← Zentraler Game-State
    /systems
      parliament.js   ← Abstimmungslogik BT + BR
      economy.js      ← KPI-System mit Lags
      levels.js       ← Ebenenwechsel-Logik
      events.js       ← Event-Pool, Trigger, Folge-Events
      chars.js        ← Charakter-Mechaniken, Ultimatums
      election.js     ← Zustimmungsberechnung, Wahl
    /views
      agenda.js       ← Gesetz-Cards
      bundesrat.js    ← Länder-Karte
      medien.js       ← Milieu-Kampagnen
      ebenen.js       ← EU/Land/Kom-Views
  /css
    main.css
    components.css
  /data
    chars.json        ← Charakter-Definitionen
    events.json       ← Event-Pool
    gesetze.json      ← Gesetz-Definitionen
    laender.json      ← Bundesrat-Konfiguration
```

### 5.3 State-Architektur
```javascript
GameState {
  // Meta
  month: 1..48,
  speed: 0|1|2,
  pk: 0..150,
  view: string,

  // Systeme
  kpi: { al, hh, gi, zf },
  kpi_prev: { ... },
  zust: { g, arbeit, mitte, prog },
  coalition: 0..100,

  // Entitäten
  chars: Char[],
  gesetze: Gesetz[],

  // Events
  activeEvent: Event | null,
  firedEvents: string[],
  firedCharEvents: string[],

  // Effekte
  pending: PendingEffect[],  // [{month, key, delta, label}]

  // Log
  log: LogEntry[],
  ticker: string,
}
```

---

## 6. Entwicklungs-Roadmap

### v0.1 — Skeleton (fertig)
- Tick-System, Pause/Speed
- 4 Gesetze, Abstimmungslogik
- Ebenenwechsel (EU/Land/Kom)
- KPI-System mit Lag
- Wahlmechanik

### v0.2 — Narrativ (fertig)
- Charakter-System (6 Kabinettsmitglieder)
- Event-Cards mit Pressezitat + Choices
- Progressive Disclosure
- Milieu-System

### v0.3 — Aktive Charaktere (fertig)
- Char-Ultimatum-Events (6 Stück)
- Passiv-Boni/Mali je Char-Stimmung
- Koalitionsstabilität-Meter
- Loyalitätssystem

### v0.4 — In Arbeit
- Random-Event-Pool ausbauen (→ 15+ Events)
- Bundesrat-Karte mit MP-Charakteren
- Länder-Lobbying vor Abstimmungen
- Folge-Events (verkettete Entscheidungen)

### v0.5 — Geplant
- Wirtschaftssystem Kausalitäten vertiefen
- Konjunkturzyklen
- Haushaltssystem mit expliziten Ausgabeentscheidungen
- Schuldenbremsenmechanik

### v0.6 — Geplant
- Medien-Agenda (Pressekonferenz, Leitmedien-Tendenz)
- Koalitionsverhandlungs-Minispiel beim Start
- Zweite Legislaturperiode (Szenario-Kontinuität)
- Historische Szenarien (Wiedervereinigung, Finanzkrise, Corona)

### v1.0 — Release
- Vollständige Bundesrat-Karte mit 16 MP-Chars
- Sound-Design (ambient, UI-Feedback)
- Onboarding-Tutorial
- Mehrere Startszenarien
- itch.io Release

---

## 7. Offene Designfragen

### 7.1 Spieltiefe vs. Zugänglichkeit
Das Kernproblem: wie viel Komplexität ist spaßig, wie viel ist erschlagend?

**These:** Komplexität ist akzeptabel wenn sie durch Dramatik eingeführt wird. Ein komplizierter Mechanismus der durch ein emotionales Event erklärt wird (Braun sabotiert) ist leichter verdaulich als ein Schieberegler in einem Menü.

**Offene Frage:** Wie viele gleichzeitig laufende Systeme kann der Spieler sinnvoll steuern? Derzeit: Gesetze (4), Chars (6), KPIs (4), Zustimmung (3 Milieus), Koalition (1). Grenzwert vermutlich ~8–10 aktive Entscheidungsobjekte gleichzeitig.

### 7.2 Bundesrat-Mechanik
Derzeit: vereinfachter Würfelwurf mit Modifikatoren. Ziel: 16 echte MP-Chars mit eigenen Interessen.

**Risiko:** Bundesrat-Lobbying könnte zu einem separaten Minispiel werden das die Hauptagenda überlagert. Mögliche Lösung: Bundesrat nur bei zustimmungspflichtigen Gesetzen spielerisch relevant, sonst unsichtbar im Hintergrund.

### 7.3 Wirtschafts-Kausalitäten
Derzeit: direkte numerische Effekte (EE-Gesetz → AL -0.3%). Realistischer aber auch befriedigender wäre: indirekte Kausalitäten über mehrere Schritte.

**Idee:** Policy → Wirtschaftssektoren → KPIs. Wohnungsbau → Baunachfrage steigt → AL sinkt AND Gini sinkt. Damit entstehen unerwartete Nebeneffekte die das Spiel lebendiger machen.

### 7.4 Schwierigkeitsgrade
Derzeit: ein Modus. Optionen:

- **Normalmodus:** Bundesregierung mit stabiler Koalition (SPD+Grüne)
- **Schwer:** Minderheitsregierung, jedes Gesetz erfordert Einzelstimmen
- **Krise:** Start mit laufendem Wirtschaftsabschwung und Koalitionsstress
- **Historisch:** Vorgegebene historische Startbedingungen

### 7.5 Wiederspielbarkeit
Einzelner Durchlauf: 45–90 Minuten (je nach Spielgeschwindigkeit). Für itch.io-Tauglichkeit wichtig.

**Ansätze:**
- Zufällig generierte Kabinetts-Zusammensetzungen
- Wechselnde Koalitionskonstellationen (SPD+Grüne, CDU+FDP, Ampel)
- Szenario-System mit verschiedenen Startpunkten
- Achievements (alle Gesetze beschlossen, keine Koalitionskrise etc.)

---

## 8. Spielmechanik-Philosophie

Drei Designprinzipien die alle Entscheidungen leiten:

**1. Jede Zahl hat ein Gesicht.**
Arbeitslosigkeit ist nicht 5,2% — es ist Maiers Problem, Brauns Waffe und Hoffmanns Wiederwahl-Risiko gleichzeitig. KPIs werden nie abstrakt kommuniziert.

**2. Das Spiel kommt zum Spieler.**
Nicht der Spieler sucht Probleme. Events unterbrechen, Charaktere fordern, der Ticker warnt. Die Oberfläche ist ruhig — die Tiefe öffnet sich auf Abruf.

**3. Scheitern ist ein Werkzeug.**
Ein blockiertes Gesetz ist kein Fehler — es ist der Beginn der Ebenenmechanik. Die interessantesten Züge entstehen wenn normale Wege versperrt sind.

---

*Dokument wird laufend ergänzt. Aktuelle Code-Version: bundesrepublik_v3.html*
