# Komplexitätsstufen

---

## 4.1 Designprinzip

Schwierigkeit steigt nicht durch härtere KPI-Werte oder schnellere Events — sondern durch die **Anzahl aktiver Systeme** die der Spieler gleichzeitig managen muss. Jede Stufe ist eine qualitativ andere Spielerfahrung mit demselben Setting, denselben Charakteren und denselben Mechaniken.

Das löst drei Probleme auf einmal: Onboarding (Systeme werden schrittweise eingeführt), Wiederspielbarkeit (4 × 48 Monate = 4 konzeptionell verschiedene Durchläufe) und Zugänglichkeit (Stufe 1 ist auch ohne Politikwissen spielbar).

**Kernregel:** Jedes Spielsystem hat ein `minLevel`-Flag im Code. Der Game-State kennt das aktuelle Level und aktiviert/rendert nur freigegebene Systeme. Keine versteckten Mechaniken — was nicht aktiv ist, ist nicht sichtbar.

---

## 4.2 Die vier Stufen

### Stufe 1 — Kanzleramt *(Einstieg)*

**Aktive Systeme:**
- Bundestag-Abstimmungen (vereinfacht, kein Bundesrat)
- 3 Gesetzentwürfe (statt 4)
- 2 Kabinettsmitglieder: Hoffmann (Kanzlerin) + Lehmann (Finanzen)
- 5 Random Events aus Pool (keine Char-Ultimatums)
- 2 Wählermilieus (Arbeit + Mitte, kein Progressiv)
- Kein Ebenenwechsel — Blockade = Entwurf zurückgezogen

**Deaktiviert:** Bundesrat, EU-Ebene, Länder-Pilot, Städtebündnis, Char-Ultimatums, Koalitionsstabilität, Progressiv-Milieu

**Wahlhürde:** ≥ 35% Zustimmung

**Spielgefühl:** Fast ein Narrative-Game. Spieler lernt: Gesetz einbringen → Abstimmung → Wirkung abwarten → Event reagieren. Kein Multitasking nötig.

**Startbeschreibung im Spiel:** *"Du übernimmst das Kanzleramt. Fokus auf das Wesentliche — bring deine wichtigsten Vorhaben durch den Bundestag."*

---

### Stufe 2 — Große Koalition *(Einsteiger)*

**Neu hinzugekommen (gegenüber Stufe 1):**
- Vollständiges Kabinett (alle 6 Chars)
- Char-Ultimatums aktiv
- Koalitionsstabilität-Meter
- Bundesrat vereinfacht: 2 Blöcke (Ja/Nein), kein Lobbying, Würfelwurf mit Bonus
- Ebenenwechsel aktiv (EU / Länder / Kommunen)
- 8 Random Events
- 3. Milieu (Progressiv) aktiv
- 4 Gesetzentwürfe

**Deaktiviert:** Bundesrat-Sprecher, Trade-offs, Beziehungswerte, Bundesrat-Events, EU-eigene Events, Folge-Events

**Wahlhürde:** ≥ 38% Zustimmung

**Spielgefühl:** Koalitionsdynamik und Ebenenmechanik einführen. Der Spieler merkt erstmals dass Scheitern produktiv ist. Kabinett muss gepflegt werden.

**Startbeschreibung:** *"Die Koalition steht. Aber sechs starke Persönlichkeiten im Kabinett haben eigene Vorstellungen — und der Bundesrat kann deine Pläne stoppen."*

---

### Stufe 3 — Föderalismus *(Fortgeschritten)*

**Neu hinzugekommen (gegenüber Stufe 2):**
- Bundesrat voll: 4 Fraktionen mit Sprecher-Charakteren
- Beziehungswert-System (0–100 akkumulativ)
- 3-Schichten-Lobbying (PK / Trade-off / Beziehungsbonus)
- Zeitdruck: Lobbying nur im 3-Monats-Fenster
- Kohl-Sonderregel (Saboteur bei Beziehung < 15)
- Bundesrat-Event-Pool (6 eigene Events)
- 12 Random Events
- Sprecher-Wechsel-Event möglich

**Deaktiviert:** EU-eigene Events, Folge-Events, Medien-Agenda, Konjunkturzyklen

**Wahlhürde:** ≥ 40% Zustimmung

**Spielgefühl:** Verhandlungsspiel. Jede Bundesratsabstimmung ist eine Entscheidung: investiere ich PK, gehe ich einen Trade-off ein, oder wechsle ich die Ebene? Beziehungen aufbauen zahlt sich erst nach 10+ Monaten aus.

**Startbeschreibung:** *"Föderalismus bedeutet: 16 Länder, 4 Machtblöcke, und jeder hat seinen Preis. Was bietest du Huber, damit Bayern zustimmt?"*

---

### Stufe 4 — Realpolitik *(Experte)*

**Neu hinzugekommen (gegenüber Stufe 3):**
- EU-eigene Events (Kommissionsdruck, Vertragsverletzung, Förderprogramme)
- Folge-Events (Entscheidungen öffnen verkettete Konsequenzen)
- Medien-Agenda (Pressekonferenz-System, Leitmedien-Tendenz)
- Konjunkturzyklen (externe Wirtschaftsschocks, EZB-Entscheidungen)
- Haushaltssystem: explizite Ausgabeentscheidungen, Schuldenbremse spürbar
- 15+ Random Events
- Alle Char-Interaktionen voll aktiv
- Sprecher können permanent die Fraktion wechseln

**Deaktiviert:** nichts — alle Systeme aktiv

**Wahlhürde:** ≥ 42% Zustimmung

**Spielgefühl:** Alle fünf Ebenen gleichzeitig. Entscheidungen auf einer Ebene haben Konsequenzen auf anderen. Ein EU-Trade-off kann den Bundesrat entlasten aber den Haushalt belasten und Kohl provozieren. Systemisches Denken notwendig.

**Startbeschreibung:** *"Bundesrepublik, EU, 16 Länder, sechs Kabinettsmitglieder — und vier Jahre bis zur Wahl. Alles hängt mit allem zusammen."*

---

## 4.3 Feature-Matrix

| System | Stufe 1 | Stufe 2 | Stufe 3 | Stufe 4 |
|--------|---------|---------|---------|---------|
| Bundestag-Abstimmung | ✓ vereinfacht | ✓ voll | ✓ | ✓ |
| Gesetzentwürfe | 3 | 4 | 4 | 4+ |
| Kabinett-Chars | 2 | 6 | 6 | 6 |
| Char-Ultimatums | — | ✓ | ✓ | ✓ |
| Koalitionsstabilität | — | ✓ | ✓ | ✓ |
| Bundesrat (vereinfacht) | — | ✓ | — | — |
| Bundesrat (4 Fraktionen) | — | — | ✓ | ✓ |
| Bundesrat-Lobbying | — | — | ✓ | ✓ |
| Trade-off-System | — | — | ✓ | ✓ |
| Beziehungswerte | — | — | ✓ | ✓ |
| Bundesrat-Events | — | — | ✓ | ✓ |
| Ebenenwechsel | — | ✓ | ✓ | ✓ |
| EU-eigene Events | — | — | — | ✓ |
| Folge-Events | — | — | — | ✓ |
| Medien-Agenda | — | — | — | ✓ |
| Konjunkturzyklen | — | — | — | ✓ |
| Haushaltssystem (explizit) | — | — | — | ✓ |
| Wählermilieus | 2 | 3 | 3 | 3 |
| Random Events (Pool) | 5 | 8 | 12 | 15+ |
| Wahlhürde | 35% | 38% | 40% | 42% |

---

## 4.4 Technische Implementierung

```javascript
// Game-State Erweiterung
const G = {
  complexity: 1,  // 1–4, bei Spielstart gewählt
  // ...
}

// Jedes System prüft vor Aktivierung
function isBundesratActive() {
  return G.complexity >= 2;
}
function isBundesratFullActive() {
  return G.complexity >= 3;
}
function isTradeoffActive() {
  return G.complexity >= 3;
}
function isFollowupEventsActive() {
  return G.complexity >= 4;
}

// Feature-Flag Pattern für alle Systeme
const FEATURES = {
  bundesrat_simple:    { minLevel: 2 },
  bundesrat_full:      { minLevel: 3 },
  lobbying:            { minLevel: 3 },
  tradeoff:            { minLevel: 3 },
  br_events:           { minLevel: 3 },
  eu_events:           { minLevel: 4 },
  followup_events:     { minLevel: 4 },
  media_agenda:        { minLevel: 4 },
  konjunktur_cycles:   { minLevel: 4 },
  budget_explicit:     { minLevel: 4 },
  milieu_progressiv:   { minLevel: 2 },
  char_ultimatums:     { minLevel: 2 },
  coalition_stability: { minLevel: 2 },
};

function featureActive(key) {
  return (FEATURES[key]?.minLevel ?? 1) <= G.complexity;
}
```

**Startscreen:** Vier Kacheln mit Stufen-Titel, kurzer Beschreibung und Wahlhürde. Klick startet direkt — kein Tutorial-Text, kein Onboarding-Screen. Die Beschreibung *ist* das Onboarding.
