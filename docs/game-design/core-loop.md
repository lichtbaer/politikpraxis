# Core Loop

---

## Ablauf

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
Monat 48: Wahl → Wiederwahl über **wahlhürde** (35–42 % je nach Komplexitätsstufe, gespeichert in `electionThreshold`)
```

---

## Zeitstruktur

Echtzeit mit Pause. 1 Spieltick = 1 Monat. Geschwindigkeiten: Pause / 1× (1,8 Sek/Monat) / 3× (0,6 Sek/Monat). Events pausieren automatisch.

---

## Sieg- und Niederlage-Bedingungen

- **Win-Bedingung:** Gesamtzustimmung in Monat 48 ≥ **Wahlhürde** der gewählten Stufe (Standard: 35 % / 38 % / 40 % / 42 % für Stufen 1–4).
- **Lose-Bedingungen:** Wahlzustimmung unter 40% bei Wahl, oder Koalitionsbruch (Stabilitätswert < 15%).
