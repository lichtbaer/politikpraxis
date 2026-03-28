# UI-Architektur

---

## 5.1 Layout (3-Spalten)

```
┌─────────────────────────────────────────────────────────┐
│  HEADER: Titel · Monat/Jahr · Geschwindigkeit · PK      │
├──────────────┬──────────────────────┬───────────────────┤
│ LEFT (260px) │  CENTER (flex)        │ RIGHT (300px)     │
│              │                      │                   │
│ Wahlprognose │ Ticker                │ Wirtschafts-KPIs  │
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

---

## 5.2 Progressive Disclosure

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

---

## 5.3 Aesthetic

- **Stil:** Politisches Nachrichtenmagazin meets Strategiespiel
- **Schriften:** Playfair Display (Serif, für Titel/Zitate), DM Sans (UI), DM Mono (Zahlen/Codes)
- **Farben:** Dunkle Erdtöne (#1a1712 Hintergrund), Gold-Akzente (#c8a84a), semantische Statusfarben
- **Event-Cards:** Serif-Kursiv für Pressezitate, farbige Rand-Akzente nach Event-Typ
- **Ziel:** Fühlt sich wie ein hochwertig produziertes Tablet-Spiel an, nicht wie ein Verwaltungstool

---

## 5.4 Screen-Fluss

Drei Screens vor dem eigentlichen Spiel. Laden überspringt Screens 2 und 3 und geht direkt ins Spiel.

```
Hauptmenü
    │
    ├── Neues Spiel → Spielstart-Screen → Wahlnacht-Screen → Spiel
    │
    └── Spiel laden → Spiel (direkt, kein Onboarding)
```

**Cloud (optional):** Mit Account können mehrere **Speicher-Slots** auf dem Server genutzt werden (`/api/saves`). Lokaler Stand lässt sich nach Login in einen Slot **hochladen** (Migration).

**Designprinzip:** Kein einziger Tutorial-Text. Kontext wird narrativ geliefert — durch Schlagzeilen, Ansprachen, Atmosphäre. Der Spieler wird mit dramatischem Schwung ins Spiel geworfen, nicht mit Erklärungen.

---

## 5.5 Screen 1 — Hauptmenü

**Visuell:** Vollbild-Hintergrund, gedämpft dunkel. Oben: Spieltitel in Serif-Schrift, groß. Darunter: vertikale Button-Liste. Unten rechts: Versionsnummer.

**Elemente (Ist):**
- **Neues Spiel** — primär, goldener Akzent → Route `/setup`
- **Spiel laden** — lokaler Spielstand (`localStorage`), wenn vorhanden
- **Cloud-Speicherstände** — nach Login: Slot-Liste, Laden in die Session
- **Sprache** — umschalten de/en (persistiert, z. B. `localStorage`)
- **Account** — Login/Logout für Cloud-Saves
- **Credits** — tertiär

**Geplant für später:** dedizierte Einstellungsseite (Audio etc.), Ambient-Musik (v1.0).

**Atmosphäre:** Kein Animation-Overkill. Ggf. subtiles Rauschen oder sehr langsames Überblenden eines abstrakten Hintergrundbildes (Reichstagsgebäude-Silhouette, stark stilisiert).

---

## 5.6 Screen 2 — Spielstart

Mehrere Blöcke, vertikal gestapelt. Klick auf „Kandidatur annehmen“ startet den Wahlnacht-Screen.

**Block A — Name (optional)**

Freitextfeld: *"Dein Name"*. Placeholder: *"Kanzleramt"*.

Wenn leer gelassen: alle Spielreferenzen lauten neutral ("das Kanzleramt", "die Regierung", "Sie"). Mit Name: Events und Chars sprechen direkt an. Der **Kanzler/die Kanzlerin** ist die Spielerrolle (synthetischer Char im Kabinett); Name und **Geschlecht der Anrede** (sie/er/they) steuern Texte — ohne zusätzliche Mechanik.

**Block A2 — Spielbare Partei**

Auswahl einer Startpartei (Koalitionspartner und Kabinett-Pools ergeben sich daraus).

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

## 5.7 Screen 3 — Wahlnacht-Onboarding

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

Char-Avatare erscheinen nacheinander (Stagger-Animation). Anzahl und Besetzung entsprechen der **gewählten Komplexitätsstufe und Parteien** (dynamisches Kabinett aus Content-Pools, nicht fest „Hoffmann + Lehmann“).

Kurze Erklärung: *"Dein Kabinett …"* — Text kann die tatsächliche Personenzahl widerspiegeln.

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

## 5.8 Personalisierung — technische Referenz

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
