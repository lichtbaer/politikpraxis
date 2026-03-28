# Bundesrepublik — Game Design Document
**Version 0.5 · Stand: März 2026** — an die Implementierung in **politikpraxis** (React/TypeScript-Frontend, `frontend/src/core/`) angeglichen

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

**Win-Bedingung:** Gesamtzustimmung in Monat 48 ≥ **Wahlhürde** der gewählten Komplexitätsstufe (35 % / 38 % / 40 % / 42 % für Stufen 1–4; Feld `electionThreshold` im Spielstand).

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

**Gesetz-Lebenszyklus (Implementierung):**

```
Entwurf → [optional: Vorstufen Kommune/Land/EU-Initiative] → eingebracht (Ausschuss-Lag)
       → aktiv → manuelle BT-Abstimmung
              → Ja & kein BR nötig → beschlossen
              → Ja & BR nötig → bt_passed → Bundesrat → beschlossen / blockiert (BR)
              → Nein (BT) → blockiert (bundestag)
       → blockiert (bundesrat) → Ausweichroute (EU/Land/Kommune) → …
```

**Hinweise:** Status `aktiv` = sofort abstimmbar (Legacy-/Sonderpfad). Regulärer Pfad: nach **Einbringen** ist das Gesetz `eingebracht`; die Abstimmung läuft im **Monatstick**, wenn `abstimmungMonat` erreicht ist. **Stufe 1:** festes Ausschuss-Lag 1 Monat. **Stufe 2+:** Lag aus Gesetz-Content bzw. abgeleitet.

**Bundestagsabstimmung:** > 50 % effektive Ja-Stimmen. Modifikatoren u. a.: Lobbying, Koalitionspartner-Priorität, Vorstufen-Boni, Fraktionsdisziplin (Abweichler-Risiko), Ideologie-Abstand Gesetz ↔ Koalition, Medien/Framing — je nach `features.ts`.

**Bundesratsabstimmung:** Für `land`-Gesetze, **wenn** `bundesrat_sichtbar` (ab Stufe 2). **Stufe 1:** kein BR — bei BT-Ja direkt `beschlossen`. Ab Stufe 3: vier Fraktionen, Lobbying, Trade-offs, Beziehungen (siehe 3.7). Die alte „5-Blöcke“-Skizze ist durch dieses Modell ersetzt.

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

**Erweiterung in der Implementierung:** Ab Stufe 2 wirken **Wirtschaftssektoren** und Makrogrößen (BIP, Konjunktur, Einnahmenpfad) auf den Haushalt und die Darstellung im Haushalt-Tab; die vier KPIs bleiben die zentrale Spieler-Schicht. Details: `frontend/src/core/systems/wirtschaft.ts`, `haushalt.ts`, Feature-Flags `wirtschaftssektoren`, `wirtschaft_indikatoren_charts` in `features.ts`.

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

*Random Events* (Pool; pro Durchlauf wird eine **Teilmenge** per Zufall ausgewählt, komplexere Events haben eigene `min_complexity` im Content):
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

**Folge-Events:** Für höhere Komplexität umgesetzt (`followup_events` ab Stufe 4); Ketten kommen aus dem Content und werden im Tick verarbeitet.

---

### 3.7 Bundesrat-System — 4-Fraktionen-Modell

**Designprinzip:** Nicht 16 individuelle Charaktere, sondern 4 politische Fraktionen mit je einem Sprecher. Jeder Sprecher ist ein vollwertiger Charakter mit Eigeninteressen, Trade-off-Forderungen und einem akkumulierten Beziehungswert. Der Bundesrat ist eine **eigene Agenda-Ebene** mit eigenen Events — kein reiner Reaktionsmechanismus.

---

#### 3.7.1 Die vier Fraktionen

**Fraktion 1 — Koalitionstreue** (5 Länder: NW, NI, HH, HB, SH)
- Sprecher: **Petra Schulz**, MP Niedersachsen, SPD
- Interessen: Strukturfonds Norddeutschland, Hafen­infrastruktur, Länderzuständigkeiten wahren
- Beziehungswert Start: 65 — verlässliche Basis, aber nicht blind
- Basis-Abstimmungsbereitschaft: 85%
- Charakter: Pragmatisch, kooperativ, aber empfindlich wenn Bundespolitik Länderzuständigkeiten übergeht
- Trade-off-Forderungen: "Hafen­infrastruktur ins Konjunkturpaket" / "Bildungspaket mit echten Länder-Veto-Rechten" / "Strukturfondsmittel erhöhen"

**Fraktion 2 — Pragmatische Mitte** (6 Länder: RP, SL, BE, HE, TH anteilig, SN anteilig)
- Sprecher: **Hans Brenner**, MP Rheinland-Pfalz, SPD
- Interessen: Wirtschaftswachstum Mittelstand, keine Bundeseingriffe in Regionalwirtschaft, kommunale Infrastruktur
- Beziehungswert Start: 40 — kein festes Lager, verhandelt immer
- Basis-Abstimmungsbereitschaft: 55% (ohne Lobbying Münzwurf)
- Charakter: Der entscheidende Wechselwähler. Offen für Deals, aber er verhandelt immer. Ohne Gegenleistung unberechenbar.
- Trade-off-Forderungen: "Keine Digitalsteuer auf Mittelstand" / "Weinbau-Ausnahmeregelung im Energiegesetz" / "Kommunale Infrastrukturmittel verdoppeln" / "Regionalpolitische Ausnahmeklausel"

**Fraktion 3 — Konservativer Block** (3 Länder: BY, BW, ST)
- Sprecher: **Edmund Huber**, MP Bayern, CSU
- Interessen: Föderalismus, Wirtschaftsstandort Industrie, EU-Skepsis, keine Zentralisierung
- Beziehungswert Start: 15 — struktureller Gegner
- Basis-Abstimmungsbereitschaft: 20%
- Charakter: Ideologischer Gegner der Koalition. Stimmt grundsätzlich gegen Rot-Grün — **Ausnahme**: wenn ein Gesetz Länderrechte stärkt statt schwächt, kippt er. Föderalismus schlägt Parteilinie.
- Trade-off-Forderungen: "Verfassungsrechtliche Föderalismusgarantie" / "Keine Bundeskompetenz für Bildung" / "Automobilindustrie-Ausnahme im EE-Gesetz" / "Keine EU-Überregulierung umsetzen"

**Fraktion 4 — Ostblock** (5 Länder: BB, SN, TH, MV, ST anteilig)
- Sprecher: **Matthias Kohl**, MP Sachsen, CDU
- Interessen: Strukturwandel-Investitionen Ostdeutschland, Kohleausstieg verlangsamen, Gleichwertigkeit der Lebensverhältnisse
- Beziehungswert Start: 25 — misstrauisch gegenüber allen Bundesregierungen
- Basis-Abstimmungsbereitschaft: 30%
- Charakter: Der Unberechenbare. Strukturwandel-Trauma prägt alle Entscheidungen. Investitionen in den Osten öffnen ihn — ignoriert man ihn, wird er aktiver Saboteur.
- **Sonderregel:** Bei Beziehungswert < 15 triggert Kohl eigenständig Bundesrat-Events (Sondersitzungen, Vermittlungsausschuss-Anträge)
- Trade-off-Forderungen: "Investitionsprogramm Ostdeutschland (€3 Mrd.)" / "Kohleausstieg um 3 Jahre verschieben" / "Sonderabschreibungen für ostdeutsche Unternehmen"

---

#### 3.7.2 Verhandlungssystem (3 Schichten)

Lobbying ist nur in einem **3-Monats-Fenster vor einer Abstimmung** aktiv möglich. Außerhalb dieses Fensters kann nur die Beziehung allgemein gepflegt werden.

**Schicht 1 — PK-Investition (immer verfügbar im Fenster)**
- Kosten: 15 PK pro Fraktion
- Effekt: +20% Abstimmungsbereitschaft für dieses Gesetz
- Wirkung: einmalig pro Gesetz, kein Stacking

**Schicht 2 — Trade-off (einmalig pro Gesetz)**
- Sprecher stellt eine Forderung aus seinem Pool (2–3 Optionen)
- Spieler kann annehmen, ablehnen oder gegenvorschlagen
- Annehmen: Fraktion stimmt zu, aber Gegenleistung tritt sofort in Kraft (KPI-Verschlechterung, Gesetz wird verwässert, anderes Gesetz blockiert)
- Ablehnen: Fraktion bleibt bei Basis-Bereitschaft
- Gegenvorschlag (kostet 20 PK): günstigere Alternative aushandeln

**Schicht 3 — Beziehungsbonus (passiv, akkumulativ)**
- Beziehungswert steigt durch: Lobbying (+5), Trade-off-Annahme (+10), positive Events (+5–15)
- Beziehungswert sinkt durch: Trade-off-Ablehnung (-5), Gesetze gegen Interessen (-8), Ignorieren über 6 Monate (-3/Monat)

| Beziehungswert | Effekt |
|----------------|--------|
| 80–100 | Fraktion stimmt bei nicht-ideologischen Gesetzen automatisch zu |
| 60–79 | Lobbying kostet nur 10 PK statt 15 |
| 40–59 | Normal — Lobbying wirkt voll |
| 20–39 | Lobbying-Effekt halbiert |
| 0–19 | Lobbying unwirksam — erst Beziehung reparieren (25 PK, 1 Monat) |

---

#### 3.7.3 Mehrheitsberechnung

Jede Fraktion bringt ihre Länderstimmen komplett ein (keine Splittung). Mehrheit: 9 von 16 Ländern.

```
Ja-Stimmen = Σ (Länder der Fraktion × Abstimmungsbereitschaft > 50%)

Fraktionsentscheidung:
  Basis-Bereitschaft
  + PK-Lobbying-Bonus (+20%)
  + Trade-off-Bonus (wenn angenommen: +40%)
  + Beziehungsbonus (aus Tabelle)
  + Gesetzes-Themen-Bonus (passt zum Interesse: +15%, widerspricht: -20%)
  → Würfelwurf: Ja wenn Gesamt-Bereitschaft > 50%
```

**Startmehrheit ohne Lobbying:** Nur Koalitionstreue (5) stimmt sicher zu — 5/16 = kein Mehrheit. Immer Lobbying oder Ebenenwechsel nötig für zustimmungspflichtige Gesetze.

---

#### 3.7.4 Bundesrat als eigene Agenda-Ebene

Eigene Events alle 5–8 Monate (zufällig aus Pool):

| Event | Auslöser | Effekt |
|-------|----------|--------|
| Länderfinanzausgleich-Streit | alle 12 Mo. fix | Fraktion 2+4 fordern Neuverteilung — Kosten oder Zustimmungsverlust |
| Landtagswahl kippt Fraktion | zufällig, ab Mo. 10 | Ein Land wechselt die Regierungspartei, Beziehungswert zurückgesetzt |
| Kohl eskaliert (Sondersitzung) | Beziehung Kohl < 15 | Vermittlungsausschuss wird beantragt — Gesetz verzögert 2 Monate |
| Sprecher-Wechsel | zufällig, ~20% nach Mo. 24 | Neuer Charakter mit anderen Interessen ersetzt Sprecher |
| Bundesrat-Initiative | Fraktion 3 oder 4 | Länder bringen eigenes Gesetz ein — Spieler muss reagieren |
| Föderalismusgipfel | alle 18 Mo. fix | Alle 4 Sprecher gleichzeitig — Sammel-Lobbying möglich |

---

#### 3.7.5 UI — Bundesrat-Panel

**Hauptansicht (Bundesrat-Tab):**
- 4 Fraktionskarten nebeneinander
- Je Karte: Sprecher-Avatar, Name, Länder-Liste, Beziehungsbalken, aktuelle Abstimmungsbereitschaft
- Button: "Gespräch suchen" (öffnet Lobbying-Overlay)

**Lobbying-Overlay:**
- Sprecher-Portrait + Zitat (fiktives aktuelles Statement)
- Aktuelle Forderung des Sprechers (wenn Trade-off verfügbar)
- 3 Antwortoptionen: PK-Investition / Trade-off annehmen / Ablehnen
- Countdown: "X Monate bis Abstimmung"

**Abstimmungs-Visualisierung:**
- Stimmenbalken: 16 Felder, farblich nach Fraktion
- Klickbar: zeigt Fraktionsdetail
- Mehrheitslinie bei Feld 9 sichtbar

---

### 3.8 Mediensystem

**Wählermilieus:** Im Content bis zu **sieben** Milieus; Darstellung und Drift in der UI **stufenweise** (aggregiert → vier → alle sieben → Trend/Drift auf Expertenstufe).

**Medienkampagne (10 PK):** Zielmilieu ansteuern.

**Medienklima & Akteure:** Gesamtindex mit Drift; mehrere Medienakteure (öffentlich, Boulevard, Social, …) mit wachsender Differenzierung je Stufe. Gesetze und Entscheidungen können Akteure und Schlagzeilen beeinflussen.

**Spieleraktionen (Auszug):** Framing beim Einbringen, Pressemitteilung (Cooldown), weitere Medienaktionen auf höheren Stufen; Opposition und Skandal-Mechanik sind angebunden.

**Ticker:** Laufender Nachrichtentext im Center-Panel.

**Medien-Agenda (Experte):** erweiterte Kopplung über `media_agenda` und zugehörige Systeme in `medienklima.ts` — Presse/Agenda-Gameplay ist nicht mehr „nur geplant“, sondern stufenabhängig aktiv.

---

## 4. Komplexitätsstufen

### 4.1 Designprinzip

Schwierigkeit steigt nicht durch härtere KPI-Werte oder schnellere Events — sondern durch die **Anzahl aktiver Systeme** die der Spieler gleichzeitig managen muss. Jede Stufe ist eine qualitativ andere Spielerfahrung mit demselben Setting, denselben Charakteren und denselben Mechaniken.

Das löst drei Probleme auf einmal: Onboarding (Systeme werden schrittweise eingeführt), Wiederspielbarkeit (4 × 48 Monate = 4 konzeptionell verschiedene Durchläufe) und Zugänglichkeit (Stufe 1 ist auch ohne Politikwissen spielbar).

**Kernregel:** Jedes Spielsystem hat in `frontend/src/core/systems/features.ts` ein `minLevel` (1–4). Zusätzlich tragen viele Content-Datensätze `min_complexity` (Gesetze, Events, Milieus, Minister …). Der Game-State speichert `complexity` und `electionThreshold` (Wahlhürde). Keine versteckten Mechaniken — was nicht aktiv ist, wird nicht gerendert oder nicht ausgeführt.

---

### 4.2 Die vier Stufen (Ist-Stand)

Ausführliche Stufenbeschreibung: **`docs/game-design/komplexitaet.md`**. Kurzfassung:

| Stufe | Kabinett (typisch) | Bundesrat | Wahlhürde | Schwerpunkt |
|-------|-------------------|-----------|-----------|----------------|
| 1 | 2 (Kanzler/in + 1 Minister aus Parteipool) | ausgeblendet; `land`-Gesetze nach BT-Ja direkt beschlossen | 35 % | Bundestag, reduzierte Parallelität |
| 2 | 5 | Tab sichtbar, noch ohne volles Lobbying/Trade-off der Stufe 3 | 38 % | Koalition, BR-Phase für Länder-Gesetze, Ebenen/Vorstufen |
| 3 | 7 | vier Fraktionen, Lobbying, Trade-offs, Länderdetail | 40 % | Föderalismus, Verbands/Politikfelder-Tiefe |
| 4 | 8 | wie 3 + mehr EU/Medien/Follow-ups/… | 42 % | maximale Systemkopplung |

**Spieler-setup:** Wählbare **Partei**, **Ausrichtung** (drei Achsen), **Name**, **Kanzler-Anrede** (sie/er/they); Kabinett wird aus Content-Pools zusammengesetzt (`bildeKabinett`).

---

### 4.3 Feature-Matrix (Kurz)

Die vollständige Matrix ist die Datei **`features.ts`** (über 100 Einträge). Die Tabelle in `docs/game-design/komplexitaet.md` fasst die wichtigsten Säulen zusammen. Veraltet ist jede Darstellung, die Stufe 1 mit „kein Ebenenwechsel“ oder fest „Hoffmann/Lehmann“ ohne Pool beschreibt.

---

### 4.4 Technische Implementierung

```typescript
// frontend/src/core/systems/features.ts
export function featureActive(complexity: number, key: string): boolean {
  return (FEATURES[key]?.minLevel ?? 1) <= complexity;
}
```

**Stack:** React 19, TypeScript, Vite, Zustand-Stores, Engine `frontend/src/core/engine.ts`. **Persistenz:** `localStorage` und optional FastAPI-Backend (`/api/saves`). Ausführliche Architektur: `docs/entwicklung/architektur.md`, `CLAUDE.md`.

**Startscreen:** Vier Komplexitäts-Kacheln → **Wahlnacht-Onboarding** (narrativ, kein Tutorial-Text).

---

## 5. UI-Architektur

### 5.1 Layout (3-Spalten)

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

### 5.2 Progressive Disclosure

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

**Nie automatisch sichtbar (Designziel):**
- Tiefe Bundesrat-Konfiguration auf einen Blick
- Rohe Effektformeln

**Hinweis:** Auf höheren Stufen können **Wirtschafts-Charts** und Sektor-Hinweise im Haushalt/Verbände-Bereich freigeschaltet sein (`features.ts`) — das widerspricht nicht dem Prinzip, solange keine vollständige Formel-Aufschlüsselung erzwungen wird.

### 5.3 Aesthetic

- **Stil:** Politisches Nachrichtenmagazin meets Strategiespiel
- **Schriften:** Playfair Display (Serif, für Titel/Zitate), DM Sans (UI), DM Mono (Zahlen/Codes)
- **Farben:** Dunkle Erdtöne (#1a1712 Hintergrund), Gold-Akzente (#c8a84a), semantische Statusfarben
- **Event-Cards:** Serif-Kursiv für Pressezitate, farbige Rand-Akzente nach Event-Typ
- **Ziel:** Fühlt sich wie ein hochwertig produziertes Tablet-Spiel an, nicht wie ein Verwaltungstool

---

### 5.4 Screen-Fluss

Drei Screens vor dem eigentlichen Spiel. Laden überspringt Screens 2 und 3 und geht direkt ins Spiel.

```
Hauptmenü
    │
    ├── Neues Spiel → Spielstart-Screen → Wahlnacht-Screen → Spiel
    │
    └── Spiel laden → Spiel (direkt, kein Onboarding)
```

**Designprinzip:** Kein einziger Tutorial-Text. Kontext wird narrativ geliefert — durch Schlagzeilen, Ansprachen, Atmosphäre. Der Spieler wird mit dramatischem Schwung ins Spiel geworfen, nicht mit Erklärungen.

---

### 5.5 Screen 1 — Hauptmenü

**Visuell:** Vollbild-Hintergrund, gedämpft dunkel. Oben: Spieltitel in Serif-Schrift, groß. Darunter: vertikale Button-Liste. Unten rechts: Versionsnummer.

**Elemente:**
- **Neues Spiel** — primär, goldener Akzent
- **Spiel laden** — sekundär, nur sichtbar wenn Spielstand vorhanden (localStorage)
- **Einstellungen** — sekundär (Lautstärke, Sprache — Platzhalter für v1.0)
- **Credits** — tertiär

**Atmosphäre:** Kein Animation-Overkill. Ggf. subtiles Rauschen oder sehr langsames Überblenden eines abstrakten Hintergrundbildes (Reichstagsgebäude-Silhouette, stark stilisiert). Musik-Ambient ab Hauptmenü (v1.0).

---

### 5.6 Screen 2 — Spielstart

Drei Blöcke, vertikal gestapelt. Klick auf "Kandidatur annehmen" startet Wahlnacht-Screen.

**Block A — Name (optional)**

Freitextfeld: *"Dein Name"*. Placeholder: *"Kanzleramt"*.

Wenn leer gelassen: alle Spielreferenzen lauten neutral ("das Kanzleramt", "die Regierung", "Sie"). Mit Name: Events und Chars sprechen direkt an ("Bundeskanzler/in [Name], Lehmann fordert..."). Name hat keine mechanische Wirkung — nur narrative.

**Block B — Politische Ausrichtung (3 Schieberegler)**

Nicht als Links/Rechts beschriftet — zu parteipolitisch belastet. Stattdessen als Wertedimensionen:

| Regler | Linker Pol | Rechter Pol |
|--------|-----------|-------------|
| Wirtschaft | Umverteilung | Wachstum |
| Gesellschaft | Offenheit | Ordnung |
| Staat | Gemeinschaft | Eigenverantwortung |

Unter den Reglern: ein kurzer generierter Satz der die Ausrichtung beschreibt. Beispiele:
- "Dein Kurs: sozial ausgewogen, gesellschaftlich offen, gemeinschaftsorientiert."
- "Dein Kurs: wachstumsorientiert, ordnungsbewusst, auf Eigenverantwortung setzend."

**Mechanische Auswirkungen der Ausrichtung:**

*Wirtschaft (Umverteilung ↔ Wachstum):*
- Umverteilung: Arbeit-Milieu +8 Start, Mitte-Milieu -5 Start, Lehmann-Beziehung -10
- Wachstum: Mitte-Milieu +8 Start, Arbeit-Milieu -5 Start, Maier-Beziehung +10

*Gesellschaft (Offenheit ↔ Ordnung):*
- Offenheit: Progressiv-Milieu +10 Start, Braun-Beziehung -15, Kern-Beziehung +10
- Ordnung: Progressiv-Milieu -8 Start, Braun-Beziehung +10, Kern-Beziehung -5

*Staat (Gemeinschaft ↔ Eigenverantwortung):*
- Gemeinschaft: Bundesrat-Fraktionen Schulz +8, Kohl +5 Start
- Eigenverantwortung: Bundesrat-Fraktion Huber +10 Start, Brenner-Beziehung +5

Alle Werte sind Startboni/Mali auf bestehende Basiswerte — kein Wert kippt komplett. Spieler mit extremer Ausrichtung haben eine klarere Ausgangslage aber auch weniger Flexibilität.

**Block C — Komplexitätsstufe**

Vier Kacheln nebeneinander. Jede Kachel:
- Nummer + Titel (z.B. "1 — Kanzleramt")
- 2–3 Bullet-Points was aktiv ist
- Wahlhürde (z.B. "Ziel: 35%")
- Aktuell ausgewählte Kachel: goldener Rahmen

Kachel 1 ist Standard-Vorauswahl. Keine Empfehlungs-Markierung ("empfohlen für Einsteiger") — das wirkt bevormundend. Die Beschreibung spricht für sich.

---

### 5.7 Screen 3 — Wahlnacht-Onboarding

Die wichtigste Designentscheidung: **kein Tutorial, kein Erklärungs-Text**. Stattdessen eine kurze dramatische Sequenz die den Spieler emotional ins Spiel zieht.

**Sequenz (4 Beats, je mit Weiter-Button oder automatisch nach 3 Sek.):**

**Beat 1 — Schlagzeile**

Vollbild, dunkler Hintergrund. Langsam einblendend: eine stilisierte Zeitungsschlagzeile.

```
BUNDESTAGSWAHL 2025

[NAME] GEWINNT —
NEUE REGIERUNG MÖGLICH

40,2% · SPD/Grüne-Koalition wahrscheinlich
Wahlbeteiligung: 76,3% · Historische Nacht in Berlin
```

Unten: kleiner Button "Weiter" oder automatisches Weiterblättern nach 4 Sek.

**Beat 2 — Kabinett-Vorstellung**

Sechs Char-Avatare erscheinen nacheinander (Stagger-Animation, je 300ms Versatz). Unter jedem: Name, Rolle, ein Ein-Wort-Charakterisierung ("verlässlich", "eigensinnig", "prinzipientreu"...). Kurze Erklärung: *"Dein Kabinett. Sechs Persönlichkeiten, sechs Agenden."*

Nur auf Stufe 1: nur Hoffmann und Lehmann erscheinen. Stufe 2+: alle sechs.

**Beat 3 — Erste Pressemitteilung**

Ein fiktives internes Memo, als wäre es gerade eingegangen. Stil: Behördendeutsch mit leichter Dringlichkeit.

```
AN: Bundeskanzleramt
VON: Koalitionsarbeitsgruppe
BETREFF: Koalitionsvertrag — offene Punkte

Der Entwurf des Koalitionsvertrags liegt vor.
Vier Gesetzentwürfe sind priorisiert.
Politisches Kapital: 100 Einheiten verfügbar.
Erste Bundesratssitzung: in 3 Monaten.

Die Arbeit beginnt jetzt.
```

Auf Stufe 1: kein Bundesrat-Hinweis. Text passt sich an aktive Systeme an.

**Beat 4 — Call to Action**

Minimalistisch. Nur Text, groß, zentriert:

*"Glückwunsch. Du hast gewonnen.*
*Jetzt fängt die Arbeit richtig los."*

Button: **"Ins Kanzleramt"** — goldener Akzent, größer als alle anderen Buttons im Spiel.

Klick → Spiel startet, Monat 1, alle Systeme initialisiert.

---

### 5.8 Personalisierung — technische Referenz

**Name im Spielcode:**

```javascript
// State
G.playerName = '';  // leer = neutrale Anrede

// Hilfsfunktion für alle Textreferenzen
function kanzler(fallback = 'das Kanzleramt') {
  return G.playerName ? `Bundeskanzler/in ${G.playerName}` : fallback;
}

// Verwendung in Events
`"${kanzler()}, Lehmann fordert sofortige Maßnahmen."`
// → "Bundeskanzler/in Müller, Lehmann fordert..."
// → "Das Kanzleramt muss sofortige Maßnahmen ergreifen." (ohne Name)
```

**Ausrichtung im Spielcode:**

```javascript
G.ausrichtung = {
  wirtschaft:   0,  // -100 (Umverteilung) bis +100 (Wachstum)
  gesellschaft: 0,  // -100 (Offenheit) bis +100 (Ordnung)
  staat:        0,  // -100 (Gemeinschaft) bis +100 (Eigenverantwortung)
};

// Beim Spielstart: Startwerte modifizieren
function applyAusrichtung() {
  const w = G.ausrichtung.wirtschaft / 100;  // -1 bis +1
  const g = G.ausrichtung.gesellschaft / 100;
  const s = G.ausrichtung.staat / 100;

  // Milieu-Starts
  G.zust.arbeit    += Math.round(-w * 8);
  G.zust.mitte     += Math.round(w * 8);
  G.zust.prog      += Math.round(-g * 10);

  // Char-Beziehungen (nur wenn Stufe ≥ 2)
  if (featureActive('char_ultimatums')) {
    getChar('fm').loyalty += Math.round(-w * 2);  // Lehmann mag Wachstum
    getChar('wm').loyalty += Math.round(w * 2);   // Maier mag Wachstum
    getChar('im').mood    += Math.round(g * 1);   // Braun mag Ordnung
    getChar('jm').mood    += Math.round(-g * 1);  // Kern mag Offenheit
  }

  // Bundesrat (nur wenn Stufe ≥ 3)
  if (featureActive('bundesrat_full')) {
    getBR('schulz').relation += Math.round(-s * 8);
    getBR('huber').relation  += Math.round(s * 10);
  }
}
```

---

## 6. Technischer Stack

### 6.1 Aktuell (Produktcode politikpraxis)

- **Frontend:** React 19, TypeScript (strict), Vite, Zustand, TanStack Query, react-router-dom, i18next, CSS Modules; Spiel-Logik **ohne** React in `frontend/src/core/`
- **Backend:** FastAPI, SQLAlchemy 2 (async), PostgreSQL, Alembic — u. a. Auth, Cloud-Saves, Content-API
- **Deploy:** Docker, nginx (siehe Repo-Root)

### 6.2 Projektstruktur (Auszug)

```
frontend/src/core/     ← engine.ts, state.ts, types/, systems/
frontend/src/store/    ← gameStore, uiStore, authStore, contentStore
frontend/src/ui/       ← Screens, Views, Panels, Komponenten
backend/app/           ← API, Modelle, Services
```

Dokumentiert in `CLAUDE.md`, `docs/entwicklung/projektstruktur.md`, `docs/entwicklung/architektur.md`.

### 6.3 State-Architektur

Der autoritative Typ ist **`GameState`** in `frontend/src/core/types/` (modular aufgeteilt). Er enthält u. a. Monat, Geschwindigkeit, PK, Komplexität, **electionThreshold**, Spielerpartei, Koalitionspartner, Haushalt, EU-Route, Medienklima, eingebrachte Gesetze, Vermittlungsausschuss, Wahlkampf-Zustände — weit über die frühe MVP-Skizze hinaus. Für Details siehe TypeScript-Definitionen und `createInitialState` in `frontend/src/core/state.ts`.

---

## 7. Entwicklungs-Roadmap

Die **aktuelle** Meilenstein-Liste liegt in **`docs/game-design/roadmap.md`** (dort: v0.1–v1.0 an den Code angeglichen). Kurzfassung:

- **Bis v0.5:** Kernspiel, Shell, Speicherstände, Bundesrat/EU/Haushalt/Medien/Wahlkampf/Verfassungs- und Regierungsmechaniken sind überwiegend implementiert und über Komplexität geschaltet.
- **v0.6+:** Vertiefung (z. B. zweite Legislatur, historische Szenarien, Koalitions-Minispiel), mehr Content.
- **v1.0:** Polish (Sound), ggf. 16-MP-Bundesrat als Content-/UI-Ausbau, Release-Kanal.

---

## 8. Offene Designfragen

### 8.1 Spieltiefe vs. Zugänglichkeit

**Gelöst durch Komplexitätsstufen (Section 4).** Stufe 1 ist zugänglich ohne Politikwissen, Stufe 4 fordert systemisches Denken. Spieler wählen selbst ihren Einstieg.

**Verbleibende Frage:** Grenzwert simultaner Entscheidungsobjekte. Auf Stufe 4 aktiv: Gesetze (4), Chars (6), KPIs (4), Milieus (3), Bundesrat-Fraktionen (4), EU-Prozesse (variabel). Empfehlung: max. 3 gleichzeitig laufende EU/Länder/Kom-Prozesse durch PK-Kosten natürlich begrenzen.

### 8.2 Bundesrat-Mechanik

**Spezifiziert in Section 3.7; umgesetzt** ab Stufe 2 (Tab) bzw. Stufe 3 (volles Lobbying/Trade-offs/Fraktionsdetail).

**Offene Detailfragen:**
- Trade-off-Gültigkeit: gilt nur für das jeweilige Gesetz, nicht als Dauerzusage (empfohlen)
- Hubers Föderalismusregel: Gesetze bekommen `foederalismus_freundlich`-Flag oder Spieler kann Bedingung erfragen
- Bundesrat-Tab-Timing: **gelöst im Code** — Stufe 1 ohne Tab; `land`-Gesetze ohne BR-Durchlauf

### 8.3 Wirtschafts-Kausalitäten

**Umsetzung:** Sektoren und Makrogrößen sind angebunden (`wirtschaftssektoren`, Haushalt, `tickWirtschaft`); KPIs bleiben die Spieler-Oberfläche.

**Offen:** stärker erzählbar gemachte Ketten (sichtbare „Policy → Sektor → KPI“-Narrative) und mehr überraschende Nebenwirkungen im Event-Layer.

### 8.4 Schwierigkeitsgrade ✓ *gelöst*

Umgesetzt als Komplexitätsstufen (Section 4) — nicht härtere Werte, sondern mehr aktive Systeme. Wahlhürde steigt leicht (35% → 42%) um die zusätzlichen Werkzeuge zu kompensieren.

### 8.5 Wiederspielbarkeit ✓ *gelöst*

Vier qualitativ verschiedene Durchläufe durch Komplexitätsstufen. Zusätzlich geplant: zufällige Kabinetts-Zusammensetzungen, wechselnde Koalitionskonstellationen (SPD+Grüne, CDU+FDP, Ampel als Startoptionen auf Stufe 3+4), Achievements.

### 8.6 Startscreen-Design (neu)

Vier Kacheln ohne Tutorial-Text. Die Stufenbeschreibung *ist* das Onboarding. Wichtig: Stufe wird beim Start gewählt und ist im laufenden Spiel nicht änderbar — das verhindert dass Spieler bei Schwierigkeit einfach zurückschalten.



---

## 9. Spielmechanik-Philosophie

Drei Designprinzipien die alle Entscheidungen leiten:

**1. Jede Zahl hat ein Gesicht.**
Arbeitslosigkeit ist nicht 5,2% — es ist Maiers Problem, Brauns Waffe und Hoffmanns Wiederwahl-Risiko gleichzeitig. KPIs werden nie abstrakt kommuniziert.

**2. Das Spiel kommt zum Spieler.**
Nicht der Spieler sucht Probleme. Events unterbrechen, Charaktere fordern, der Ticker warnt. Die Oberfläche ist ruhig — die Tiefe öffnet sich auf Abruf.

**3. Scheitern ist ein Werkzeug.**
Ein blockiertes Gesetz ist kein Fehler — es ist der Beginn der Ebenenmechanik. Die interessantesten Züge entstehen wenn normale Wege versperrt sind.

---

*Dokument wird laufend ergänzt. Code-Basis: Repository **politikpraxis** (`frontend/src/core/`, `features.ts`). GDD-Version siehe Kopfzeile.*
