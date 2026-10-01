# Komplexitätsstufen

---

## 4.1 Designprinzip

Schwierigkeit steigt nicht durch härtere KPI-Werte allein — sondern durch die **Anzahl aktiver Systeme** und UI-Elemente, die der Spieler gleichzeitig managen muss. Jede Stufe ist eine qualitativ andere Spielerfahrung mit demselben Setting und derselben Engine.

**Kernregel (Implementierung):** In `frontend/src/core/systems/features.ts` trägt jedes Feature ein `minLevel` (1–4). UI und Engine rufen `featureActive(complexity, key)` auf. Was nicht aktiv ist, wird nicht angezeigt oder nicht ausgeführt — keine versteckten Mechaniken für den Spieler.

Zusätzlich filtern **Content-Felder** wie `min_complexity` (Gesetze, Events, Milieus, Minister, EU-Inhalte …) das sichtbare Angebot pro Stufe.

---

## 4.2 Die vier Stufen (Ist-Stand Code)

### Stufe 1 — Kanzleramt *(Einstieg)*

**Typisch aktiv:**

- Bundestag inkl. **Eingebracht-Phase** (Ausschuss): festes Einbringungs-Lag von 1 Monat; danach automatische Abstimmung im Tick (mit Fraktionsdisziplin, falls Feature aktiv — ab Stufe 2 ohnehin Kabinett-Fokus)
- **Kein Bundesrat-Tab** (`bundesrat_sichtbar` ab Stufe 2). Gesetze mit Länderbezug (`land`-Tag): bei Ja im Bundestag **direkter Beschluss** ohne BR-Phase
- **Kabinett:** 2 Personen — Spieler/in als Kanzler/in (synthetisch) plus ein Minister aus dem **Parteipool**, das erste Präferenz-Ressort der Partei (`bildeKabinett` in `frontend/src/core/kabinett.ts`; Kanzler- und Stufe-1-Minister-Chars haben seit Migration 073 `min_complexity = 1`, #481)
- Gesetze in der Agenda: nur Entwürfe mit `min_complexity ≤ 1` (Filter in `AgendaView`)
- **Keine** Char-Ultimatums, **kein** Koalitionsstabilitäts-Meter, **kein** Koalitionspartner (`char_ultimatums`, `coalition_stability`, `koalitionspartner` ab Stufe 2)
- **Keine** Vorstufen-Buttons für Kommunal/Land auf Entwürfen (`kommunal_pilot` / `laender_pilot` ab Stufe 2); EU-Panel für Routen entsprechend eingeschränkt
- **Wahlkampf**-Grundsystem ab Monat 43 ist bereits freigeschaltet (`wahlkampf`: minLevel 1)
- Zufalls-Events: Pool wird pro Lauf per `selectEventPool` auf eine **Teilmenge** reduziert; komplexere Event-Typen haben eigene `min_complexity` im Content. **Keine Story-Arc-Einstiege** — ohne Folge-Events käme ihre Fortsetzung nie
- **Legislatur-Agenda mit 2 selbst gewählten Zielen** (#267), nur **Gesetzesziele** (#475): Stufe 1 hat weder Milieu-Werte noch Verbands-Hebel, Milieuziele kommen ab Stufe 2 („Prekäre“ ab 3), Verbandsziele ab Stufe 3 (Verbandsgespräch). Siegbedingung auf dieser Stufe: **beide Ziele erfüllt** (zusätzlich ≥ 40 Punkte und mindestens ein beschlossenes Gesetz). Auf Stufe 1 gehen Gesetze fast von selbst durch — reine Punkte trennten gutes von zufälligem Spiel kaum; die Ziele sind das sichtbare Siegkriterium der Einstiegsstufe

**Wahlhürde:** 35% (wird beim Spielstart in `state.electionThreshold` gesetzt)

**Spielgefühl:** Fokus Bundestag und Kern-Loop; weniger parallele Akteure.

---

### Stufe 2 — Große Koalition *(Einsteiger)*

**Neu gegenüber Stufe 1 (Auszug):**

- Bundesrat-Tab sichtbar (`bundesrat_sichtbar`); Detailansichten und volles Lobbying erst ab Stufe 3
- Volleres Kabinett (**5** aktive Charaktere inkl. Kanzler/in), Koalitionspartner, Koalitionsstabilität, Char-Ultimatums
- Mehr Gesetze (`min_complexity ≤ 2`), Progressiv-Milieu / erweiterte Milieu-Darstellung
- Ebenen: **EU-Route**, Kommunal- und Länder-Vorstufen, Gegenfinanzierung, Kongruenz-Einfluss auf PK beim Einbringen, Framing (stufenabhängig)
- Haushaltsdebatte, Schuldenbremse-Widget, Konjunktur-Anzeige, Vermittlungsausschuss, Legislatur-Bilanz, Medienklima-Grundzüge, u. v. m. (siehe `features.ts`)
- **Folge-Events und Story-Arcs** (`followup_events`, seit #267 ab Stufe 2 statt 4)

**Wahlhürde:** 38%

---

### Stufe 3 — Föderalismus *(Fortgeschritten)*

**Neu gegenüber Stufe 2 (Auszug):**

- Bundesrat **im Detail:** vier Fraktionen, Lobbying, Trade-offs, BR-Events, Länderliste, bilaterale Landesgespräche; ab hier ist das länder-gewichtete 35/69-Stimmenmodell (Art. 51 Abs. 2 GG) Standard — Stufe 1–2 nutzen den vereinfachten 9/16-Pfad
- Kabinett bis zu **7** Personen; erweiterte Minister-Pools (`kabinett_erweiterung`)
- Alle **7 Milieus** im Medien-Screen, Politikfeld-Druck, Verbands-Lobbying, Partner-Widerstand vor Einbringen, Normenkontrolle, erweiterte EU-Mechaniken (`eu_klima`, `eu_reaktiv`, …)

**Wahlhürde:** 40%

---

### Stufe 4 — Realpolitik *(Experte)*

**Neu gegenüber Stufe 3 (Auszug):**

- Kabinett bis zu **8** Personen (`kabinett_voll`)
- EU-Events voll, Medien-Agenda im erweiterten Sinn, Konjunkturzyklen / expliziteres Budget, Milieu-Drift, Koalitionsvertrag-Score, Koalitionspartner-Alleingang, erweiterte Medienakteure, Sachverständigenrat, u. a.

**Wahlhürde:** 42%

**Hinweis:** Die vollständige Liste steht in `frontend/src/core/systems/features.ts` — diese Dokuseite fasst nur zusammen.

---

## 4.3 Feature-Matrix (Kurzfassung)

| Thema | Stufe 1 | Stufe 2 | Stufe 3 | Stufe 4 |
|--------|---------|---------|---------|---------|
| Bundestag inkl. Eingebracht-Phase | ✓ | ✓ | ✓ | ✓ |
| Bundesrat-Tab | — | ✓ (einfacher) | ✓ (voll) | ✓ |
| Ausweichrouten / EU-Ebene (UI) | eingeschränkt | ✓ | ✓ | ✓ |
| Kabinettgröße inkl. Kanzler/in (`KABINETT_GROESSE`) | 2 | 5 | bis 7 | bis 8 |
| Koalitionspartner & -stabilität | — | ✓ | ✓ | ✓ |
| Char-Ultimatums | — | ✓ | ✓ | ✓ |
| Lobbying / Trade-off BR | — | — | ✓ | ✓ |
| Haushalt / Konjunktur / Schuldenbremse (Tiefe) | minimal | wächst | wächst | voll |
| Medienklima / Akteure (Tiefe) | minimal | wächst | wächst | voll |
| Legislatur-Agenda (Spielerziele) | 2 (Pflicht) | 2 | 3 | 3 |
| Folge-Events / Story-Arcs | — | ✓ | ✓ | ✓ |
| EU-Events | — | — | teils | ✓ |
| Wahlhürde (%) | 35 | 38 | 40 | 42 |

---

## 4.4 Technische Implementierung

Die authoritative Quelle ist **`frontend/src/core/systems/features.ts`** (Zustand: `GameState.complexity` bzw. Store `complexity`). Das folgende Schema ist vereinfacht:

```typescript
function featureActive(complexity: number, key: string): boolean {
  return (FEATURES[key]?.minLevel ?? 1) <= complexity;
}
```

**Startscreen:** Vier Kacheln mit Stufen-Titel und Kurzbeschreibung; gewählte Stufe fix für den Lauf. Onboarding erfolgt über **Wahlnacht-Sequenz** und UI, nicht über Tutorial-Text.
