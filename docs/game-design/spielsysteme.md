# Spielsysteme

---

## 3.1 Politisches Kapital (PK)

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

## 3.2 Kabinett & Charaktersystem

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

## 3.3 Gesetzgebungssystem

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

## 3.4 Ebenenmechanik (Kernfeature)

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

## 3.5 Wirtschaftssystem (4 KPIs)

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

## 3.6 Event-System

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

## 3.7 Bundesrat-System — 4-Fraktionen-Modell

**Designprinzip:** Nicht 16 individuelle Charaktere, sondern 4 politische Fraktionen mit je einem Sprecher. Jeder Sprecher ist ein vollwertiger Charakter mit Eigeninteressen, Trade-off-Forderungen und einem akkumulierten Beziehungswert. Der Bundesrat ist eine **eigene Agenda-Ebene** mit eigenen Events — kein reiner Reaktionsmechanismus.

### 3.7.1 Die vier Fraktionen

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

### 3.7.2 Verhandlungssystem (3 Schichten)

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

### 3.7.3 Mehrheitsberechnung

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

### 3.7.4 Bundesrat als eigene Agenda-Ebene

Eigene Events alle 5–8 Monate (zufällig aus Pool):

| Event | Auslöser | Effekt |
|-------|----------|--------|
| Länderfinanzausgleich-Streit | alle 12 Mo. fix | Fraktion 2+4 fordern Neuverteilung — Kosten oder Zustimmungsverlust |
| Landtagswahl kippt Fraktion | zufällig, ab Mo. 10 | Ein Land wechselt die Regierungspartei, Beziehungswert zurückgesetzt |
| Kohl eskaliert (Sondersitzung) | Beziehung Kohl < 15 | Vermittlungsausschuss wird beantragt — Gesetz verzögert 2 Monate |
| Sprecher-Wechsel | zufällig, ~20% nach Mo. 24 | Neuer Charakter mit anderen Interessen ersetzt Sprecher |
| Bundesrat-Initiative | Fraktion 3 oder 4 | Länder bringen eigenes Gesetz ein — Spieler muss reagieren |
| Föderalismusgipfel | alle 18 Mo. fix | Alle 4 Sprecher gleichzeitig — Sammel-Lobbying möglich |

### 3.7.5 UI — Bundesrat-Panel

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

## 3.8 Mediensystem (einfach)

**Drei Wählermilieus:**
- Arbeit (Fokus: Beschäftigung, Löhne, soziale Sicherheit)
- Mitte (Fokus: Haushalt, Stabilität, Verlässlichkeit)
- Progressiv (Fokus: Klima, Gerechtigkeit, Modernisierung)

**Medienkampagne (10 PK):** +2–5% Zustimmung im Zielmilieu. Einmalig, keine Abklingzeit.

**Ticker:** Laufender Nachrichtentext oben im Center-Panel. Aktualisiert bei Events und wichtigen Entscheidungen.

**Geplant:** Medien-Agenda — Spieler kann Pressekonferenz einberufen (Risiko/Chance-System), Leitmedien haben eigene politische Tendenz und verstärken/dämpfen Events.
