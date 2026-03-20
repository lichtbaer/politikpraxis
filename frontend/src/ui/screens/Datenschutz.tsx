import { Link } from 'react-router-dom';
import { LegalPageShell } from './LegalPageShell';
import styles from './LegalPage.module.css';

export function Datenschutz() {
  return (
    <LegalPageShell title="Datenschutzerklärung">
      <div className={styles.prose}>
        <p>
          <strong>Stand:</strong> März 2025. Diese Erklärung gilt für die Nutzung der Webanwendung
          Politikpraxis / Bundesrepublik unter der Domain, unter der diese Anwendung bereitgestellt
          wird.
        </p>

        <div className={styles.highlight}>
          <strong>Politikpraxis lädt keine externen Ressourcen.</strong> Alle Schriften, Kartendaten
          und Medien werden lokal ausgeliefert. Es werden keine Tracking-Cookies gesetzt.
        </div>

        <h2>1. Verantwortliche Stelle</h2>
        <p>
          Verantwortlich für die Datenverarbeitung im Sinne der DSGVO ist die in unserem{' '}
          <Link to="/impressum">Impressum</Link> genannte Anbieterin (Nexclue UG (haftungsbeschränkt)).
          Kontakt für Datenschutzanfragen: bitte nutzen Sie die im Impressum angegebene E-Mail-Adresse
          oder unser <Link to="/kontakt">Kontaktformular</Link> mit dem Betreff „Datenschutzanfrage“.
        </p>

        <h2>2. Welche Daten werden erhoben?</h2>
        <ul>
          <li>
            <strong>Ohne Konto:</strong> Es werden keine personenbezogenen Daten zur Nutzung des
            Spiels im Browser zwingend erhoben oder gespeichert (soweit technisch nicht unvermeidbar,
            z. B. serverseitige Protokolle — siehe unten).
          </li>
          <li>
            <strong>Mit Konto:</strong> Zur Registrierung und Anmeldung werden Ihre{' '}
            <strong>E-Mail-Adresse</strong> sowie ein <strong>Passwort-Hash</strong> (kein Klartext)
            verarbeitet und gespeichert. Weitere freiwillige Profildaten werden — soweit angeboten —
            gesondert in dieser Erklärung oder in der Anwendung beschrieben.
          </li>
          <li>
            <strong>Spielstände (Cloud-Speicherung):</strong> Wenn Sie die Speicherung von
            Spielständen serverseitig nutzen, werden die hierfür erforderlichen Daten (z. B. Spielstand
            verknüpft mit Ihrem Konto) verarbeitet.
          </li>
        </ul>

        <h2>3. Zwecke der Verarbeitung</h2>
        <ul>
          <li>Bereitstellung der Anwendung und der vertraglich geschuldeten Leistungen (Spiel)</li>
          <li>Authentifizierung und Verwaltung von Nutzerkonten</li>
          <li>Speicherung und Synchronisation von Spielständen, soweit genutzt</li>
          <li>Erfüllung gesetzlicher Pflichten</li>
        </ul>

        <h2>4. Rechtsgrundlage</h2>
        <p>
          Die Verarbeitung der Daten, die zur Nutzung des Spiels und eines Nutzerkontos erforderlich
          sind, erfolgt auf Grundlage von <strong>Art. 6 Abs. 1 lit. b DSGVO</strong> (Vertragserfüllung
          bzw. vorvertragliche Maßnahmen).
        </p>

        <h2>5. Speicherdauer</h2>
        <ul>
          <li>
            <strong>Kontodaten und Spielstände:</strong> bis zur <strong>Löschung Ihres Accounts</strong>{' '}
            bzw. bis zur Löschung der zugehörigen Daten, sofern keine längeren gesetzlichen
            Aufbewahrungspflichten entgegenstehen.
          </li>
          <li>
            <strong>Magic Links (Einmal-Anmeldelinks):</strong> <strong>15 Minuten</strong> gültig,
            danach ungültig.
          </li>
          <li>
            <strong>Refresh Tokens:</strong> <strong>30 Tage</strong>, sofern diese Funktion
            angeboten wird — sofern keine längere Nutzung durch Sie ausdrücklich gewählt wird.
          </li>
        </ul>

        <h2>6. Weitergabe an Dritte</h2>
        <p>
          Eine Weitergabe Ihrer personenbezogenen Daten an Dritte zu Werbezwecken erfolgt nicht. Eine
          Übermittlung erfolgt nur, soweit dies zur Vertragserfüllung technisch erforderlich ist
          (z. B. Hosting/Rechenzentrum) oder wir gesetzlich dazu verpflichtet sind.
        </p>

        <h2>7. Cookies und lokale Speicherung</h2>
        <p>
          Es werden <strong>keine Tracking-Cookies</strong> gesetzt. Für die Anmeldung kann ein{' '}
          <strong>HttpOnly-Auth-Cookie</strong> (oder vergleichbare serverseitige Sitzungstechnik)
          verwendet werden, der der Authentifizierung dient und nicht zu Tracking-Zwecken ausgewertet
          wird.
        </p>

        <h2>8. Tracking und Analytics</h2>
        <p>
          Wir setzen <strong>kein Tracking</strong> und <strong>kein Analytics</strong> (z. B. keine
          Google Analytics, keine Pixel) ein.
        </p>

        <h2>9. Server- und Verbindungsdaten</h2>
        <p>
          Beim Aufruf der Anwendung können technisch bedingt kurzzeitig Informationen (z. B. IP-Adresse,
          Zeitstempel) in Server-Logfiles verarbeitet werden, soweit dies zur Sicherheit und Stabilität
          des Dienstes erforderlich ist. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO (berechtigtes
          Interesse an sicherem Betrieb).
        </p>

        <h2>10. Ihre Rechte</h2>
        <p>Sie haben insbesondere das Recht auf:</p>
        <ul>
          <li>Auskunft (Art. 15 DSGVO)</li>
          <li>Berichtigung (Art. 16 DSGVO)</li>
          <li>Löschung (Art. 17 DSGVO)</li>
          <li>Einschränkung der Verarbeitung (Art. 18 DSGVO)</li>
          <li>Datenübertragbarkeit (Art. 20 DSGVO)</li>
          <li>Widerspruch (Art. 21 DSGVO), soweit anwendbar</li>
        </ul>
        <p>
          Verantwortlich für die Ausübung Ihrer Rechte: siehe Ziffer 1. Die Löschung Ihres Accounts
          kann — soweit in der Anwendung vorgesehen — dort angestoßen werden; alternativ erreichen Sie
          uns über das <Link to="/kontakt">Kontaktformular</Link>.
        </p>

        <h2>11. Beschwerderecht</h2>
        <p>
          Sie haben das Recht, sich bei einer Datenschutz-Aufsichtsbehörde zu beschweren. Zuständig ist
          die Behörde an Ihrem gewöhnlichen Aufenthaltsort oder am Sitz des Verantwortlichen.
        </p>
      </div>
    </LegalPageShell>
  );
}
