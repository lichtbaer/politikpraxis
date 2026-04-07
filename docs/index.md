# politikpraxis — Dokumentation

Willkommen in der Dokumentation von **politikpraxis**. Das Projekt enthält die browserbasierte Politiksimulation **Bundesrepublik**.

## Was ist Bundesrepublik?

Bundesrepublik ist eine Echtzeit-Politiksimulation mit Pause. Du führst eine Bundesregierung durch eine 4-jährige Legislaturperiode, bringst Gesetze durch Bundestag und Bundesrat und musst Kabinett, Koalition, EU-Ebene und Kommunen im Blick behalten — mit dem Ziel: Wiederwahl.

*GDD-Version: 0.5 · Stand: März 2026 — an Implementierung (React/TS-Core) angeglichen*

---

## Dokumentation

### Game Design

Konzept, Spielmechanik und Design-Entscheidungen:

- **[Konzept & Vision](game-design/konzept.md)** — Elevator Pitch, Designziel, Multilevel Governance
- **[Core Loop](game-design/core-loop.md)** — Ablauf, Zeitstruktur, Sieg/Niederlage
- **[Spielsysteme](game-design/spielsysteme.md)** — PK, Kabinett, Gesetze, Ebenen, Wirtschaft, Events, Bundesrat, Medien
- **[Komplexitätsstufen](game-design/komplexitaet.md)** — Vier Stufen von Einstieg bis Experte
- **[UI-Architektur](game-design/ui-architektur.md)** — Layout, Screens, Personalisierung
- **[Technischer Stack (Spiel)](game-design/tech-stack.md)** — State, geplante Dateistruktur
- **[Roadmap](game-design/roadmap.md)** — v0.1 bis v1.0
- **[Offene Designfragen](game-design/designfragen.md)** — Gelöste und offene Punkte

### Entwicklung

Setup und Architektur für Entwickler:

- **[Lokales Setup](entwicklung/setup.md)** — Docker, Frontend, Backend, Datenbank
- **[Projektstruktur](entwicklung/projektstruktur.md)** — Ordner, Module, Konfiguration
- **[Architektur](entwicklung/architektur.md)** — State, Datenfluss, Backend-API

---

## Quick Links

| Ziel | Befehl / Link |
|------|----------------|
| Spiel mit Docker starten | `docker compose up --build` → http://localhost:8080 |
| Doku lokal ansehen | `pip install -r docs/requirements.txt && mkdocs serve` → http://127.0.0.1:8000 |
| Doku bauen | `mkdocs build` → Ausgabe in `site/` |
