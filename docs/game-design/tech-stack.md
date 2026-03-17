# Technischer Stack (Spiel)

---

## 6.1 Aktuell

- **Frontend:** React 19, TypeScript, Vite, Zustand, Phaser, i18next/react-i18next, TanStack Query, react-router-dom
- **Backend:** FastAPI, SQLAlchemy 2 (async, asyncpg), Alembic, Pydantic
- **Infrastruktur:** Docker, PostgreSQL 16, nginx

State-Modell und Spiel-Logik folgen dem GDD; die Umsetzung (Typen, Engine, Systeme) steht in `frontend/src/core/` und ist unter [Entwicklung → Architektur](../entwicklung/architektur.md) beschrieben.

---

## 6.2 Dateistruktur

Die aktuelle Projektstruktur (Frontend `frontend/src/`, Backend `backend/app/`) ist unter [Entwicklung → Projektstruktur](../entwicklung/projektstruktur.md) beschrieben.

*Historisch: Ursprünglich war eine reine JS-Struktur unter `/bundesrepublik` mit engine.js, state.js und systems/ geplant; umgesetzt wurde stattdessen die React/TypeScript-Struktur mit `core/engine.ts`, `core/state.ts` und `core/systems/`.*

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
