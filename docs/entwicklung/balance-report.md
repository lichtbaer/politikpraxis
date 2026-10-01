# Balance-Report

> Automatisch erzeugt via `npm run balance:report` (Issue #210).
> Reproduzierbar bei gleichem Seed; keine Test-Schwellen — Schwellen bleiben in den Tests.

| Parameter | Wert |
|-----------|------|
| Erzeugt am | 2026-09-30T23:00:55.571Z |
| Läufe pro Zelle (N) | 200 |
| Seed | 42 |
| Komplexitätsstufen | 1, 2, 3, 4 |
| Strategien | 25 |
| Content | DB-Snapshot content-snapshot.json (115 Gesetze, 52 Events) |
| Spieler-Agenda | ag_gesetz_breit_regieren, ag_milieu_mitte, ag_gesetz_klimawende (je Stufe gekürzt auf die Onboarding-Anzahl) |

## Komplexität 1 (Wahlhürde 35%)

| Strategie | Gewinnrate | Wahlhürde | Prognose (med) | p10 | p90 | Gesetze | Gesamt | Bilanz | Agenda | Urteil | Saldo | PK-Ende | PK<10 (Mon.) | Verlustgrund | Hänger (Mon.) | Crashes | EngErr |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| random | 100% | 100% | 49.0 | 43.0 | 56.0 | 5 | 61.0 | 71.0 | 55.0 | 54.0 | 0.0 | 12 | 9 | – | 0 | 0 | 0 |
| immer_einbringen | 100% | 100% | 57.0 | 53.0 | 58.0 | 12 | 64.7 | 84.0 | 55.0 | 54.0 | 0.0 | 13 | 15 | – | 0 | 0 | 0 |
| nur_sparen | 100% | 100% | 45.0 | 40.0 | 49.0 | 4 | 58.7 | 67.0 | 55.0 | 53.0 | 0.0 | 130 | 0 | – | 0 | 0 | 0 |
| nur_ausgaben | 100% | 100% | 57.0 | 55.0 | 59.0 | 12 | 67.6 | 84.0 | 55.0 | 62.0 | 0.0 | 14 | 15 | – | 0 | 0 | 0 |
| pk_horten | 0% | 100% | 42.0 | 38.0 | 46.0 | 0 | 33.6 | 15.0 | 55.0 | 25.0 | 0.0 | 145 | 0 | Punkte | 0 | 0 | 0 |
| ideologisch_sdp | 100% | 100% | 60.0 | 57.0 | 61.0 | 12 | 64.8 | 82.0 | 55.0 | 56.0 | 0.0 | 12 | 15 | – | 0 | 0 | 0 |
| ideologisch_cdp | 100% | 100% | 60.0 | 57.0 | 61.0 | 12 | 64.8 | 82.0 | 55.0 | 56.0 | 0.0 | 14 | 14 | – | 0 | 0 | 0 |
| musterschueler | 100% | 100% | 60.0 | 57.0 | 61.0 | 12 | 64.8 | 82.0 | 55.0 | 56.0 | 0.0 | 14 | 9 | – | 0 | 0 | 0 |
| sparkommissar | 100% | 100% | 45.0 | 40.0 | 49.0 | 4 | 58.6 | 67.0 | 55.0 | 53.0 | 0.0 | 128 | 0 | – | 0 | 0 | 0 |
| koalitionsbrecher | 100% | 100% | 50.0 | 46.0 | 55.0 | 11 | 64.2 | 80.0 | 55.0 | 56.0 | 0.0 | 13 | 16 | – | 0 | 0 | 0 |
| medienmogul | 0% | 97% | 39.0 | 34.0 | 43.0 | 0 | 33.4 | 15.0 | 55.0 | 25.0 | 0.0 | 8 | 23 | Punkte | 0 | 0 | 0 |
| verbands_freund | 100% | 100% | 59.0 | 57.0 | 61.0 | 13 | 62.8 | 82.0 | 55.0 | 49.0 | 0.0 | 12 | 15 | – | 0 | 0 | 0 |
| speed_runner | 100% | 100% | 57.0 | 54.0 | 58.0 | 12 | 64.8 | 84.0 | 55.0 | 54.0 | 0.0 | 13 | 15 | – | 0 | 0 | 0 |
| bundesrat_profi | 100% | 100% | 60.0 | 57.0 | 61.0 | 12 | 64.8 | 82.0 | 55.0 | 56.0 | 0.0 | 14 | 14 | – | 0 | 0 | 0 |
| kabinettspfleger | 100% | 100% | 60.0 | 57.0 | 61.0 | 12 | 64.8 | 82.0 | 55.0 | 56.0 | 0.0 | 12 | 14 | – | 0 | 0 | 0 |
| medienstratege | 100% | 100% | 50.0 | 44.0 | 55.0 | 6 | 60.2 | 68.0 | 55.0 | 56.0 | 0.0 | 14 | 13 | – | 0 | 0 | 0 |
| kommunalpolitiker | 100% | 100% | 51.0 | 46.0 | 55.0 | 8 | 63.5 | 76.0 | 55.0 | 56.0 | 0.0 | 12 | 2 | – | 0 | 0 | 0 |
| wahlkaempfer | 100% | 100% | 60.0 | 57.0 | 61.0 | 12 | 64.8 | 82.0 | 55.0 | 56.0 | 0.0 | 16 | 14 | – | 0 | 0 | 0 |
| koalitionsmanager | 100% | 100% | 60.0 | 58.0 | 61.0 | 12 | 64.8 | 82.0 | 55.0 | 56.0 | 0.0 | 12 | 14 | – | 0 | 0 | 0 |
| allrounder | 100% | 100% | 56.0 | 50.0 | 59.0 | 9 | 65.7 | 82.0 | 55.0 | 58.0 | 0.0 | 16 | 15 | – | 0 | 0 | 0 |
| vermittlungsprofi | 100% | 100% | 60.0 | 57.0 | 61.0 | 11 | 64.8 | 82.0 | 55.0 | 56.0 | 0.0 | 23 | 13 | – | 0 | 0 | 0 |
| schuldenmacher | 100% | 100% | 59.0 | 57.0 | 61.0 | 13 | 65.7 | 88.0 | 55.0 | 52.0 | 0.0 | 12 | 15 | – | 0 | 0 | 0 |
| historiker | 100% | 100% | 56.0 | 53.0 | 58.0 | 12 | 69.5 | 82.0 | 55.0 | 70.0 | 0.0 | 13 | 15 | – | 0 | 0 | 0 |
| stapler | 100% | 100% | 60.0 | 58.0 | 61.0 | 12 | 64.8 | 82.0 | 55.0 | 56.0 | 0.0 | 17 | 6 | – | 0 | 0 | 0 |
| burst_spieler | 100% | 100% | 60.0 | 58.0 | 61.0 | 11 | 64.9 | 82.0 | 55.0 | 56.0 | 0.0 | 27 | 0 | – | 0 | 0 | 0 |

## Komplexität 2 (Wahlhürde 38%)

| Strategie | Gewinnrate | Wahlhürde | Prognose (med) | p10 | p90 | Gesetze | Gesamt | Bilanz | Agenda | Urteil | Saldo | PK-Ende | PK<10 (Mon.) | Verlustgrund | Hänger (Mon.) | Crashes | EngErr |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| random | 75% | 78% | 53.0 | 48.0 | 58.0 | 3 | 59.7 | 33.0 | 79.0 | 51.5 | -14.5 | 7 | 15 | Koalitionsbruch | 0 | 0 | 0 |
| immer_einbringen | 31% | 31% | 58.0 | 54.0 | 62.0 | 6 | 0.0 | 0.0 | 0.0 | 0.0 | -16.3 | 11 | 17 | Koalitionsbruch | 0 | 0 | 0 |
| nur_sparen | 87% | 99% | 48.0 | 45.0 | 51.0 | 0 | 41.7 | 15.0 | 79.0 | 25.0 | -22.0 | 10 | 4 | Punkte | 0 | 0 | 0 |
| nur_ausgaben | 22% | 22% | 58.0 | 53.0 | 63.0 | 6 | 0.0 | 0.0 | 0.0 | 0.0 | -13.8 | 11 | 18 | Koalitionsbruch | 0 | 0 | 0 |
| pk_horten | 94% | 100% | 50.0 | 47.0 | 54.0 | 0 | 41.8 | 15.0 | 79.0 | 25.0 | -15.0 | 96 | 0 | Punkte | 0 | 0 | 0 |
| ideologisch_sdp | 78% | 78% | 68.0 | 65.0 | 71.0 | 9 | 76.2 | 65.0 | 100.0 | 56.0 | 14.0 | 8 | 18 | Unbekannt | 0 | 0 | 0 |
| ideologisch_cdp | 83% | 83% | 68.0 | 65.0 | 72.0 | 10 | 76.5 | 65.0 | 100.0 | 57.0 | 14.0 | 8 | 18 | Unbekannt | 0 | 0 | 0 |
| musterschueler | 97% | 97% | 67.0 | 60.0 | 71.0 | 8 | 77.1 | 66.0 | 100.0 | 58.0 | 12.0 | 8 | 17 | Koalitionsbruch | 0 | 0 | 0 |
| sparkommissar | 86% | 100% | 48.0 | 45.0 | 52.0 | 0 | 41.7 | 15.0 | 79.0 | 25.0 | -22.0 | 11 | 4 | Punkte | 0 | 0 | 0 |
| koalitionsbrecher | 21% | 28% | 46.0 | 43.0 | 49.0 | 0 | 0.0 | 0.0 | 0.0 | 0.0 | -15.0 | 10 | 19 | Koalitionsbruch | 0 | 0 | 0 |
| medienmogul | 56% | 85% | 47.0 | 43.0 | 52.0 | 0 | 41.5 | 15.0 | 79.0 | 25.0 | -16.0 | 8 | 28 | Punkte | 0 | 0 | 0 |
| verbands_freund | 62% | 62% | 65.5 | 59.0 | 70.0 | 8 | 73.4 | 61.0 | 100.0 | 50.0 | -6.5 | 9 | 19 | Koalitionsbruch | 0 | 0 | 0 |
| speed_runner | 24% | 24% | 58.0 | 54.0 | 63.0 | 7 | 0.0 | 0.0 | 0.0 | 0.0 | -16.1 | 11 | 17 | Koalitionsbruch | 0 | 0 | 0 |
| bundesrat_profi | 100% | 100% | 68.0 | 63.0 | 71.0 | 8 | 76.9 | 65.0 | 100.0 | 58.0 | 13.3 | 7 | 15 | Koalitionsbruch | 0 | 0 | 0 |
| kabinettspfleger | 99% | 99% | 67.0 | 63.0 | 71.0 | 9 | 77.1 | 66.0 | 100.0 | 58.0 | 14.0 | 7 | 18 | Koalitionsbruch | 0 | 0 | 0 |
| medienstratege | 66% | 66% | 57.0 | 52.0 | 62.0 | 4 | 61.2 | 36.0 | 79.0 | 57.0 | -15.7 | 7 | 17 | Koalitionsbruch | 0 | 0 | 0 |
| kommunalpolitiker | 95% | 98% | 53.0 | 47.0 | 58.0 | 1 | 56.2 | 33.0 | 79.0 | 50.0 | -13.9 | 7 | 15 | Koalitionsbruch | 0 | 0 | 0 |
| wahlkaempfer | 81% | 81% | 68.0 | 64.0 | 72.0 | 9 | 76.3 | 65.0 | 100.0 | 56.5 | 15.0 | 9 | 18 | Unbekannt | 0 | 0 | 0 |
| koalitionsmanager | 100% | 100% | 67.0 | 61.0 | 71.0 | 8 | 77.1 | 65.0 | 100.0 | 58.0 | 13.8 | 7 | 19 | Koalitionsbruch | 0 | 0 | 0 |
| allrounder | 97% | 97% | 58.0 | 53.0 | 63.0 | 4 | 68.9 | 49.0 | 89.0 | 60.0 | -9.2 | 8 | 19 | Koalitionsbruch | 0 | 0 | 0 |
| vermittlungsprofi | 87% | 87% | 68.0 | 59.0 | 72.0 | 10 | 76.0 | 64.0 | 100.0 | 56.0 | 14.0 | 11 | 17 | Unbekannt | 0 | 0 | 0 |
| schuldenmacher | 86% | 86% | 66.0 | 61.0 | 69.0 | 8 | 74.1 | 65.0 | 100.0 | 52.0 | -36.5 | 8 | 18 | Unbekannt | 0 | 0 | 0 |
| historiker | 28% | 28% | 58.0 | 54.0 | 62.0 | 6 | 0.0 | 0.0 | 0.0 | 0.0 | -18.5 | 12 | 16 | Koalitionsbruch | 0 | 0 | 0 |
| stapler | 100% | 100% | 64.0 | 57.0 | 68.0 | 6 | 74.9 | 59.0 | 100.0 | 58.0 | -11.5 | 7 | 14 | – | 0 | 0 | 0 |
| burst_spieler | 100% | 100% | 60.0 | 53.0 | 66.0 | 4 | 67.8 | 49.0 | 89.0 | 60.0 | -9.5 | 7 | 17 | – | 0 | 0 | 0 |

## Komplexität 3 (Wahlhürde 40%)

| Strategie | Gewinnrate | Wahlhürde | Prognose (med) | p10 | p90 | Gesetze | Gesamt | Bilanz | Agenda | Urteil | Saldo | PK-Ende | PK<10 (Mon.) | Verlustgrund | Hänger (Mon.) | Crashes | EngErr |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| random | 48% | 57% | 50.0 | 45.0 | 55.0 | 2 | 34.7 | 15.0 | 49.0 | 25.0 | -15.0 | 7 | 24 | Koalitionsbruch | 0 | 0 | 0 |
| immer_einbringen | 1% | 1% | 55.0 | 51.0 | 58.0 | 6 | 0.0 | 0.0 | 0.0 | 0.0 | -16.7 | 10 | 15 | Koalitionsbruch | 0 | 0 | 0 |
| nur_sparen | 0% | 68% | 48.0 | 44.0 | 51.0 | 0 | 34.5 | 15.0 | 60.0 | 25.0 | -21.0 | 7 | 10 | Punkte | 0 | 0 | 0 |
| nur_ausgaben | 1% | 1% | 55.0 | 51.0 | 58.0 | 5 | 0.0 | 0.0 | 0.0 | 0.0 | -10.0 | 12 | 12 | Koalitionsbruch | 0 | 0 | 0 |
| pk_horten | 0% | 100% | 50.0 | 47.0 | 53.0 | 0 | 34.7 | 15.0 | 60.0 | 25.0 | -14.0 | 64 | 0 | Punkte | 0 | 0 | 0 |
| ideologisch_sdp | 33% | 33% | 66.0 | 62.0 | 68.0 | 9 | 0.0 | 0.0 | 0.0 | 0.0 | 12.0 | 10 | 18 | Koalitionsbruch | 0 | 0 | 0 |
| ideologisch_cdp | 42% | 42% | 65.0 | 61.0 | 68.0 | 9 | 0.0 | 0.0 | 0.0 | 0.0 | 12.0 | 10 | 19 | Koalitionsbruch | 0 | 0 | 0 |
| musterschueler | 97% | 97% | 61.0 | 55.0 | 68.0 | 7 | 74.7 | 59.0 | 100.0 | 58.0 | -4.0 | 6 | 21 | Koalitionsbruch | 0 | 0 | 0 |
| sparkommissar | 0% | 69% | 48.0 | 45.0 | 51.0 | 0 | 34.5 | 15.0 | 60.0 | 25.0 | -23.0 | 7 | 11 | Punkte | 0 | 0 | 0 |
| koalitionsbrecher | 0% | 23% | 47.0 | 44.0 | 49.0 | 0 | 0.0 | 0.0 | 0.0 | 0.0 | -16.0 | 10 | 19 | Koalitionsbruch | 1 | 0 | 0 |
| medienmogul | 0% | 81% | 46.0 | 43.0 | 49.0 | 0 | 30.4 | 15.0 | 49.0 | 25.0 | -15.0 | 4 | 41 | Koalitionsbruch | 0 | 0 | 0 |
| verbands_freund | 44% | 44% | 65.0 | 62.0 | 68.0 | 8 | 0.0 | 0.0 | 0.0 | 0.0 | -5.5 | 10 | 19 | Koalitionsbruch | 0 | 0 | 0 |
| speed_runner | 2% | 2% | 55.0 | 51.0 | 58.0 | 6 | 0.0 | 0.0 | 0.0 | 0.0 | -17.7 | 11 | 14 | Koalitionsbruch | 0 | 0 | 0 |
| bundesrat_profi | 99% | 99% | 65.0 | 60.0 | 69.0 | 8 | 75.9 | 62.0 | 100.0 | 58.0 | 11.3 | 6 | 18 | Koalitionsbruch | 0 | 0 | 0 |
| kabinettspfleger | 99% | 99% | 65.0 | 61.0 | 69.0 | 9 | 76.1 | 65.0 | 100.0 | 58.0 | 13.0 | 7 | 23 | Koalitionsbruch | 0 | 0 | 0 |
| medienstratege | 17% | 17% | 53.0 | 49.0 | 57.0 | 3 | 0.0 | 0.0 | 0.0 | 0.0 | -17.9 | 6 | 26 | Koalitionsbruch | 0 | 0 | 0 |
| kommunalpolitiker | 54% | 81% | 51.0 | 46.0 | 56.0 | 1 | 45.5 | 20.0 | 60.0 | 50.0 | -14.9 | 6 | 17 | Punkte | 0 | 0 | 0 |
| wahlkaempfer | 36% | 36% | 65.0 | 61.0 | 69.0 | 9 | 0.0 | 0.0 | 0.0 | 0.0 | 12.0 | 11 | 18 | Koalitionsbruch | 0 | 0 | 0 |
| koalitionsmanager | 99% | 99% | 63.0 | 57.0 | 68.0 | 7 | 75.2 | 62.0 | 100.0 | 58.0 | 1.5 | 6 | 23 | Koalitionsbruch | 0 | 0 | 0 |
| allrounder | 18% | 18% | 49.0 | 45.0 | 53.0 | 2 | 0.0 | 0.0 | 0.0 | 0.0 | -13.5 | 6 | 38 | Koalitionsbruch | 0 | 0 | 0 |
| vermittlungsprofi | 99% | 99% | 57.0 | 51.0 | 61.0 | 5 | 73.2 | 56.0 | 100.0 | 58.0 | -20.5 | 6 | 42 | Koalitionsbruch | 0 | 0 | 0 |
| schuldenmacher | 6% | 6% | 57.0 | 54.0 | 59.0 | 5 | 0.0 | 0.0 | 0.0 | 0.0 | -32.0 | 5 | 34 | Koalitionsbruch | 0 | 0 | 0 |
| historiker | 1% | 1% | 51.0 | 48.0 | 53.0 | 4 | 0.0 | 0.0 | 0.0 | 0.0 | -18.8 | 5 | 27 | Koalitionsbruch | 0 | 0 | 0 |
| stapler | 99% | 99% | 58.0 | 53.0 | 62.0 | 5 | 73.3 | 56.0 | 100.0 | 58.0 | -18.5 | 8 | 18 | Koalitionsbruch | 0 | 0 | 0 |
| burst_spieler | 100% | 99% | 54.0 | 49.0 | 61.0 | 3 | 65.0 | 44.0 | 86.0 | 60.0 | -11.5 | 8 | 26 | Koalitionsbruch | 0 | 0 | 0 |

## Komplexität 4 (Wahlhürde 42%)

| Strategie | Gewinnrate | Wahlhürde | Prognose (med) | p10 | p90 | Gesetze | Gesamt | Bilanz | Agenda | Urteil | Saldo | PK-Ende | PK<10 (Mon.) | Verlustgrund | Hänger (Mon.) | Crashes | EngErr |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| random | 53% | 58% | 50.0 | 46.0 | 55.0 | 2 | 44.2 | 20.0 | 64.0 | 40.0 | -26.4 | 7 | 25 | Koalitionsbruch | 1 | 0 | 0 |
| immer_einbringen | 13% | 13% | 56.0 | 53.0 | 59.0 | 6 | 0.0 | 0.0 | 0.0 | 0.0 | -17.5 | 9 | 19 | Koalitionsbruch | 1 | 0 | 0 |
| nur_sparen | 0% | 56% | 47.0 | 43.0 | 50.0 | 0 | 36.0 | 15.0 | 64.0 | 25.0 | -32.0 | 7 | 13 | Punkte | 0 | 0 | 0 |
| nur_ausgaben | 6% | 6% | 55.0 | 51.0 | 58.0 | 5 | 0.0 | 0.0 | 0.0 | 0.0 | -16.4 | 10 | 15 | Koalitionsbruch | 2 | 0 | 0 |
| pk_horten | 0% | 99% | 49.0 | 46.0 | 53.0 | 0 | 36.6 | 15.0 | 64.0 | 25.0 | -29.0 | 60 | 0 | Punkte | 0 | 0 | 0 |
| ideologisch_sdp | 62% | 62% | 65.0 | 60.0 | 68.0 | 9 | 73.4 | 58.0 | 100.0 | 56.0 | -1.0 | 10 | 19 | Unbekannt | 0 | 0 | 0 |
| ideologisch_cdp | 51% | 51% | 65.0 | 60.0 | 68.0 | 9 | 70.3 | 48.0 | 93.0 | 55.0 | 1.0 | 11 | 18 | Unbekannt | 0 | 0 | 0 |
| musterschueler | 95% | 95% | 61.0 | 54.0 | 66.0 | 7 | 74.3 | 59.0 | 100.0 | 58.0 | -16.3 | 7 | 22 | Koalitionsbruch | 0 | 0 | 0 |
| sparkommissar | 0% | 54% | 47.0 | 44.0 | 50.0 | 0 | 33.3 | 15.0 | 57.0 | 25.0 | -35.0 | 8 | 13 | Punkte | 0 | 0 | 0 |
| koalitionsbrecher | 0% | 48% | 46.0 | 43.0 | 49.0 | 0 | 33.1 | 15.0 | 57.0 | 25.0 | -27.5 | 7 | 26 | Punkte | 1 | 0 | 0 |
| medienmogul | 0% | 52% | 46.0 | 42.0 | 48.0 | 0 | 33.2 | 15.0 | 57.0 | 25.0 | -24.0 | 5 | 41 | Koalitionsbruch | 0 | 0 | 0 |
| verbands_freund | 54% | 54% | 65.0 | 61.0 | 68.0 | 8 | 63.2 | 57.0 | 71.0 | 50.0 | -14.0 | 11 | 19 | Koalitionsbruch | 0 | 0 | 0 |
| speed_runner | 14% | 14% | 57.0 | 52.0 | 60.0 | 6 | 0.0 | 0.0 | 0.0 | 0.0 | -16.7 | 10 | 19 | Koalitionsbruch | 1 | 0 | 0 |
| bundesrat_profi | 100% | 100% | 64.0 | 58.0 | 68.0 | 8 | 75.5 | 62.0 | 100.0 | 58.0 | -8.8 | 7 | 18 | Koalitionsbruch | 0 | 0 | 0 |
| kabinettspfleger | 100% | 100% | 64.0 | 60.0 | 68.0 | 8 | 75.7 | 62.0 | 100.0 | 58.0 | -1.0 | 7 | 23 | Koalitionsbruch | 0 | 0 | 0 |
| medienstratege | 14% | 11% | 53.0 | 48.0 | 57.0 | 3 | 0.0 | 0.0 | 0.0 | 0.0 | -23.9 | 6 | 26 | Koalitionsbruch | 0 | 0 | 0 |
| kommunalpolitiker | 60% | 83% | 50.0 | 46.0 | 55.0 | 1 | 47.0 | 26.0 | 64.0 | 50.0 | -25.4 | 6 | 19 | Punkte | 1 | 0 | 0 |
| wahlkaempfer | 56% | 56% | 65.0 | 61.0 | 68.0 | 9 | 73.7 | 59.0 | 100.0 | 56.0 | 2.0 | 10 | 20 | Unbekannt | 0 | 0 | 0 |
| koalitionsmanager | 99% | 99% | 62.0 | 55.0 | 67.0 | 7 | 74.4 | 59.0 | 100.0 | 59.0 | -16.0 | 6 | 23 | Koalitionsbruch | 0 | 0 | 0 |
| allrounder | 36% | 30% | 49.0 | 45.0 | 52.0 | 2 | 0.0 | 0.0 | 0.0 | 0.0 | -23.4 | 5 | 39 | Koalitionsbruch | 0 | 0 | 0 |
| vermittlungsprofi | 100% | 100% | 56.0 | 50.0 | 60.0 | 5 | 72.8 | 56.0 | 100.0 | 58.0 | -29.5 | 6 | 42 | Koalitionsbruch | 0 | 0 | 0 |
| schuldenmacher | 5% | 5% | 57.0 | 53.0 | 59.0 | 5 | 0.0 | 0.0 | 0.0 | 0.0 | -42.8 | 6 | 34 | Koalitionsbruch | 0 | 0 | 0 |
| historiker | 4% | 4% | 52.0 | 49.0 | 54.0 | 4 | 0.0 | 0.0 | 0.0 | 0.0 | -21.8 | 6 | 28 | Koalitionsbruch | 0 | 0 | 0 |
| stapler | 99% | 99% | 58.0 | 52.0 | 63.0 | 5 | 72.9 | 56.0 | 100.0 | 58.0 | -31.5 | 8 | 19 | Koalitionsbruch | 0 | 0 | 0 |
| burst_spieler | 100% | 99% | 54.0 | 48.0 | 60.0 | 3 | 64.6 | 44.0 | 86.0 | 60.0 | -23.5 | 8 | 26 | Koalitionsbruch | 0 | 0 | 0 |

