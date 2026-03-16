# Technischer Stack (Spiel)

---

## 6.1 Aktuell (MVP)

- **Single HTML File** — alles in einer Datei, kein Build-System, kein Framework
- Vanilla JavaScript (ES2020+)
- Google Fonts (Playfair Display, DM Sans, DM Mono)
- Keine externen Abhängigkeiten

*Hinweis: Das laufende Projekt nutzt inzwischen React/TypeScript (Frontend) und FastAPI (Backend). Die Spiel-Logik und das State-Modell folgen weiterhin dem GDD; siehe [Entwicklung → Architektur](../entwicklung/architektur.md) für die aktuelle Code-Struktur.*

---

## 6.2 Dateistruktur (geplant für v1.0)

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

---

## 6.3 State-Architektur

```javascript
GameState {
  // Meta
  month: 1..48,
  speed: 0|1|2,
  pk: 0..150,
  view: string,
  complexity: 1..4,       // Komplexitätsstufe, bei Start gewählt, unveränderlich

  // Spieler-Personalisierung
  playerName: string,     // leer = neutrale Anrede ("das Kanzleramt")
  ausrichtung: {
    wirtschaft:   -100..100,  // Umverteilung ↔ Wachstum
    gesellschaft: -100..100,  // Offenheit ↔ Ordnung
    staat:        -100..100,  // Gemeinschaft ↔ Eigenverantwortung
  },

  // Systeme
  kpi: { al, hh, gi, zf },
  kpi_prev: { ... },
  zust: { g, arbeit, mitte, prog },
  coalition: 0..100,

  // Entitäten
  chars: Char[],
  gesetze: Gesetz[],
  bundesrat: {            // nur wenn complexity >= 2
    fraktionen: Fraktion[],
  },

  // Events
  activeEvent: Event | null,
  pendingFollowup: Event | null,  // Folge-Event (complexity >= 4)
  firedEvents: string[],
  firedCharEvents: string[],

  // Effekte
  pending: PendingEffect[],  // [{month, key, delta, label}]

  // Log
  log: LogEntry[],
  ticker: string,
}
```

Die konkrete Umsetzung im Frontend (Zustand-Store, Typen) ist unter [Entwicklung → Architektur](../entwicklung/architektur.md) beschrieben.
