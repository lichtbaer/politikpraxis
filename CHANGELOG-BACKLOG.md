# Changelog-Backlog — leichte Verbesserungen

Ergebnis der Spiel-Inspektion (Inkonsistenzen, Spielbarkeit, Balancing).
Die kritischen Punkte wurden direkt umgesetzt (siehe Commit-Historie des
Branches `claude/trusting-pasteur-v06nrj`); die folgenden leichten Tasks
sind dokumentiert und noch offen.

## Code-Hygiene

- [ ] `frontend/src/core/systems/bundesrat.ts`: toten Pfad `beziehung < 0` in `canLobby()` entfernen (Beziehung ist überall auf [0, 100] geclampt)
- [ ] `frontend/src/ui/components/LobbyingOverlay/LobbyingOverlay.tsx`: PK-Kosten-Konstanten aus `bundesrat.ts` importieren statt duplizieren
- [ ] `backend/app/content/events/random.yaml`: Unicode-Escapes in Icons (`"\U0001F4B0"`) durch lesbare Emojis ersetzen
- [ ] `recalcApproval`: ungenutzten Parameter `_currentApproval` für eine Glättung der Gesamtzustimmung `g` nutzen oder entfernen (Design-Entscheidung)

## UX / Spielbarkeit

- [ ] 404-Catch-All-Route in `frontend/src/App.tsx` (`<Route path="*">`), aktuell zeigen ungültige URLs eine leere Seite
- [ ] MainMenu: deaktivierten Settings-Button („Coming soon") entfernen oder klarer kennzeichnen
- [ ] Wahlkampf-Screen: Hinweis ergänzen, wie PK regeneriert werden, wenn alle Aktionen mangels PK deaktiviert sind
- [ ] PartnerWiderstand-Modal: „Koalitionsrunde"-Button bei zu wenig PK disablen statt Toast nach Klick
- [ ] Agenda-Sidebar: Fallback/Hinweis wenn keine Agenda-Ziele gesetzt wurden (z. B. Onboarding übersprungen)
- [ ] Vorstufen-Fortschritt (kommunal/länder/eu) auch im Gesetz-Detail anzeigen, nicht nur in der Sidebar
- [ ] GameSetup: `aria-disabled` statt `disabled` für gesperrte Komplexitätsstufen (Tastatur-Erreichbarkeit)

## i18n / Content

- [ ] Hardcodierte Fallback-Strings übersetzen: `gameStore.ts` (`erster_monat`-Fallback), `LegislaturBilanzScreen.tsx` (`FALLBACK_BOTSCHAFTEN`)
- [ ] EN-Lokalisierung des API-Contents vervollständigen (EN-Spieler sehen teilweise leere Strings; `_deprecated`-Hinweis in `public/locales/en/game.json`)
- [ ] EU-Feature-Matrix konsistenter machen: `eu_route` ab Stufe 2, aber `eu_events` erst ab Stufe 4 (`core/systems/features.ts`)

## Infrastruktur

- [ ] LocalStorage-Save-Größe beobachten; bei Bedarf Kompression oder IndexedDB (Limit ~5 MB)
- [ ] Content-Validierung (`backend/scripts/validate_content.py`) in einen CI-Workflow aufnehmen
- [ ] Vorbestehende Test-Failures fixen: `tests/test_saves_api.py::test_save_slot_out_of_range` / `::test_save_slot_zero` erwarten 422 vor Auth — seit den FastAPI/Starlette-CVE-Bumps kommt 401 zuerst (Dependency-Reihenfolge geändert)

## Dokumentation / GDD-Abgleich

- [ ] GDD: Bundesrat-Modell präzisieren — Code zählt Stimmgewichte (35 von 69), GDD spricht von „9 von 16 Ländern" (beides existiert: Fraktionen- vs. Landgewichte-Pfad)
- [ ] GDD: Vertrauensfrage-Mechanik dokumentieren (`core/systems/election.ts` — im GDD nicht erwähnt, Erfolgsformel `coalition + rnd*20 > 45` begründen oder anpassen)
- [ ] `constants.ts`: Semantik „Haushalts-Spielraum vs. strukturelles Startdefizit" klarer kommentieren (Spielraum = Schuldenbremse-Budget, nicht Saldo-Puffer)

## Balancing (nach neuen Sim-Daten ggf. nachjustieren)

- [ ] `INNEN_SKANDAL_SCHUTZ_FAKTOR` (0.5): über 48 Monate reduziert der Schutz die „mind. 1 Skandal"-Wahrscheinlichkeit nur von ~98 % auf ~90 % — Bonus fühlt sich schwach an; Sim-Metriken beobachten
- [ ] Medienklima-Multiplikator wirkt nur auf Milieu-Effekte, nicht auf Bundesrat/Verbände/Haushalt — bewusst entscheiden, ob das so bleiben soll
