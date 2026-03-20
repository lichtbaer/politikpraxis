# Kontodaten (Auth)

Für die Anmeldung werden **minimale personenbezogene Daten** gespeichert: E-Mail-Adresse, optional ein Passwort-Hash (bcrypt), Zeitstempel sowie technisch notwendige Sitzungsdaten (Refresh-Token-Hash, Magic-Link-Token). Es findet **kein Tracking** und **keine Weitergabe an Dritte** statt. Nutzer können ihr Konto über die API löschen (`DELETE /auth/account`); damit werden zugehörige Spielstände und Sitzungsdaten entfernt.
