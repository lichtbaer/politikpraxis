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
Monat 48: Wahl → Spielziel-Auswertung (Dreipfeiler ≥ 40 Punkte; Wahlhürde gibt Bonus von 0–4 Punkten)
```

---

## Zeitstruktur

Echtzeit mit Pause. 1 Spieltick = 1 Monat. Geschwindigkeiten: Pause / 1× (1,8 Sek/Monat). Events pausieren automatisch.

---

## Sieg- und Niederlage-Bedingungen

**Primäres Siegkriterium — Legislaturbilanz (`legislaturErfolg`):**
Das Spiel endet mit einem Sieg wenn `spielziel.gesamtpunkte ≥ 40` (Skala 0–100):

| Pfeiler | Gewicht | Basis |
|---------|---------|-------|
| Legislatur-Bilanz | 30 % | 10+ KPI-Metriken (Gesetze, Budget, Koalition …) |
| Agenda | 35 % | Ampelwert eigener + Koalitionsziele (grün=100, gelb=55, rot=15) |
| Historisches Urteil | 35 % | `langzeit_score` beschlossener Gesetze (0–10, gew. Mittelwert) |
| Wahlbonus | +0–4 | Zuschlag wenn Wahlergebnis ≥ Wahlhürde |

Ohne ein einziges beschlossenes Gesetz fällt das Historische Urteil auf 25 (statt neutral 50 — verhindert passives Gewinnen).

**Wahlhürde (`wahlUeberHuerde`) — Bonus, kein alleiniges Siegkriterium:**
`wahlergebnis ≥ electionThreshold` entscheidet **nicht** allein über Sieg/Niederlage, liefert aber den Wahlbonus (0–4 Punkte auf den Spielziel-Score). Zwei Sonderfälle sind möglich:

- Wahlhürde überschritten, aber Spielziel < 40 → **Niederlage** (trotz Wahlsieg)
- Wahlhürde unterschritten, aber Spielziel ≥ 40 → **Sieg** (trotz Wahlniederlage)

Wahlhürde je Komplexitätsstufe (gespeichert in `electionThreshold`):

| Stufe | Wahlhürde |
|-------|-----------|
| 1 | 35 % |
| 2 | 38 % |
| 3 | 40 % |
| 4 | 42 % |

**Verlust-Bedingungen (sofortiges Spielende, `won = false`):**

| Bedingung | Auslöser |
|-----------|----------|
| Schlechte Legislaturbilanz | `spielziel.gesamtpunkte < 40` in Monat 48 |
| Koalitionsbruch | `coalition < 15` (Stabilitätswert) |
| Misstrauensvotum | 6 Monate Zustimmung < 20 % (ab Monat 7); interaktives Event bei 4 Monaten (Stufe ≥ 2) |
| Vertrauensfrage (Art. 68 GG) | Vertrauensfrage gescheitert (Zufallscheck auf Koalitionsstabilität) |
| Rücktritt | Spieler wählt Rücktritt im Misstrauensvotum-Event |

**Begriffe:**

| Begriff | Bedeutung |
|---------|-----------|
| `won` / `legislaturErfolg` | Primäres Spielergebnis — `spielziel.gesamtpunkte ≥ 40` |
| `wahlUeberHuerde` | Wahlergebnis ≥ komplexitätsspezifische Schwelle — beeinflusst Bonus, nicht allein das Ergebnis |
| `spielziel` | Dreistufiges Auswertungsobjekt (Typ `SpielzielErgebnis`) aus `core/spielziel.ts` |
| `electionThreshold` | Komplexitätsabhängige Wahlhürde (35–42 %), im `GameState` gespeichert |
