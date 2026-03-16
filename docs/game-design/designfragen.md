# Offene Designfragen

---

## 8.1 Spieltiefe vs. Zugänglichkeit

**Gelöst durch Komplexitätsstufen (Section 4).** Stufe 1 ist zugänglich ohne Politikwissen, Stufe 4 fordert systemisches Denken. Spieler wählen selbst ihren Einstieg.

**Verbleibende Frage:** Grenzwert simultaner Entscheidungsobjekte. Auf Stufe 4 aktiv: Gesetze (4), Chars (6), KPIs (4), Milieus (3), Bundesrat-Fraktionen (4), EU-Prozesse (variabel). Empfehlung: max. 3 gleichzeitig laufende EU/Länder/Kom-Prozesse durch PK-Kosten natürlich begrenzen.

---

## 8.2 Bundesrat-Mechanik

**Spezifiziert in Section 3.7.** 4-Fraktionen-Modell mit Sprecher-Charakteren, 3-Schichten-Lobbying, Beziehungswert-System.

**Offene Detailfragen:**
- Trade-off-Gültigkeit: gilt nur für das jeweilige Gesetz, nicht als Dauerzusage (empfohlen)
- Hubers Föderalismusregel: Gesetze bekommen `foederalismus_freundlich`-Flag oder Spieler kann Bedingung erfragen
- Bundesrat-Tab-Timing: ab Stufe 2 immer sichtbar, Stufe 1 komplett ausgeblendet

---

## 8.3 Wirtschafts-Kausalitäten

Derzeit: direkte numerische Effekte. Ziel Stufe 4: indirekte Kausalitäten über Sektoren.

**Idee:** Policy → Wirtschaftssektoren → KPIs. Wohnungsbau → Baunachfrage steigt → AL sinkt AND Gini sinkt. Unerwartete Nebeneffekte machen das Spiel lebendiger. Implementierung über Sektor-Multiplikatoren im Economy-System.

---

## 8.4 Schwierigkeitsgrade ✓ gelöst

Umgesetzt als Komplexitätsstufen (Section 4) — nicht härtere Werte, sondern mehr aktive Systeme. Wahlhürde steigt leicht (35% → 42%) um die zusätzlichen Werkzeuge zu kompensieren.

---

## 8.5 Wiederspielbarkeit ✓ gelöst

Vier qualitativ verschiedene Durchläufe durch Komplexitätsstufen. Zusätzlich geplant: zufällige Kabinetts-Zusammensetzungen, wechselnde Koalitionskonstellationen (SPD+Grüne, CDU+FDP, Ampel als Startoptionen auf Stufe 3+4), Achievements.

---

## 8.6 Startscreen-Design (neu)

Vier Kacheln ohne Tutorial-Text. Die Stufenbeschreibung *ist* das Onboarding. Wichtig: Stufe wird beim Start gewählt und ist im laufenden Spiel nicht änderbar — das verhindert dass Spieler bei Schwierigkeit einfach zurückschalten.
