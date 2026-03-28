# Offene Designfragen

---

## 8.1 Spieltiefe vs. Zugänglichkeit

**Gelöst durch Komplexitätsstufen (Section 4).** Stufe 1 ist zugänglich ohne Politikwissen, Stufe 4 fordert systemisches Denken. Spieler wählen selbst ihren Einstieg.

**Verbleibende Frage:** Grenzwert simultaner Entscheidungsobjekte. Auf Stufe 4 aktiv: Gesetze (4), Chars (6), KPIs (4), Milieus (3), Bundesrat-Fraktionen (4), EU-Prozesse (variabel). Empfehlung: max. 3 gleichzeitig laufende EU/Länder/Kom-Prozesse durch PK-Kosten natürlich begrenzen.

---

## 8.2 Bundesrat-Mechanik

**Spezifiziert in Section 3.7.** 4-Fraktionen-Modell mit Sprecher-Charakteren, 3-Schichten-Lobbying, Beziehungswert-System — **umgesetzt** ab Komplexitätsstufe 3 (Detail/Lobbying); Stufe 2 zeigt den Tab in vereinfachter Form.

**Offene Detailfragen:**
- Trade-off-Gültigkeit: gilt nur für das jeweilige Gesetz, nicht als Dauerzusage (empfohlen)
- Hubers Föderalismusregel: Gesetze bekommen `foederalismus_freundlich`-Flag oder Spieler kann Bedingung erfragen
- Bundesrat-Tab-Timing: **umgesetzt** — ab Stufe 2 sichtbar, Stufe 1 ausgeblendet; Land-Gesetze werden auf Stufe 1 nach BT-Ja ohne BR-Phase beschlossen

---

## 8.3 Wirtschafts-Kausalitäten

**Teilweise umgesetzt:** Ab Stufe 2 (`wirtschaftssektoren` in `features.ts`) koppeln Haushalt/Einnahmen an Sektoren und Makroindikatoren (`tickWirtschaft`, Haushalt-Tab). Die vier KPIs (AL, HH, Gini, ZF) bleiben die Spieler-Schicht; Sektoren liefern zusätzliche Tiefe und Dashboards.

**Weiteres Ziel:** stärker erzählbar gemachte Ketten (Policy → Sektor → KPI) und mehr spürbare Nebeneffekte im Event-/Content-Layer — ohne die KPI-Basis zu ersetzen.

---

## 8.4 Schwierigkeitsgrade ✓ gelöst

Umgesetzt als Komplexitätsstufen (Section 4) — nicht härtere Werte, sondern mehr aktive Systeme. Wahlhürde steigt leicht (35% → 42%) um die zusätzlichen Werkzeuge zu kompensieren.

---

## 8.5 Wiederspielbarkeit ✓ gelöst

Vier qualitativ verschiedene Durchläufe durch Komplexitätsstufen. Zusätzlich geplant: zufällige Kabinetts-Zusammensetzungen, wechselnde Koalitionskonstellationen (SPD+Grüne, CDU+FDP, Ampel als Startoptionen auf Stufe 3+4), Achievements.

---

## 8.6 Startscreen-Design (neu)

Vier Kacheln ohne Tutorial-Text. Die Stufenbeschreibung *ist* das Onboarding. Wichtig: Stufe wird beim Start gewählt und ist im laufenden Spiel nicht änderbar — das verhindert dass Spieler bei Schwierigkeit einfach zurückschalten.
