import { LegalPageShell } from './LegalPageShell';
import styles from './LegalPage.module.css';

const registrationNumber = import.meta.env.VITE_REGISTRATION_NUMBER ?? '[in Eintragung]';

export function Impressum() {
  return (
    <LegalPageShell title="Impressum">
      <div className={styles.prose}>
        <h2>Angaben gemäß § 5 TMG</h2>
        <p>
          <strong>Johannes Göpel</strong>
          <br />
          [Straße und Hausnummer]
          <br />
          [PLZ und Ort]
          <br />
          Deutschland
        </p>
        <p>
          <strong>Kontakt:</strong>{' '}
          <a href="mailto:kontakt@politikpraxis.de">kontakt@politikpraxis.de</a>
        </p>
        <p>
          <strong>Vertretungsberechtigte Person:</strong> Johannes Göpel
        </p>
        <p>
          <strong>Registergericht:</strong> [nach Eintragung]
          <br />
          <strong>Registernummer:</strong> {registrationNumber}
        </p>
        <p>
          <strong>USt-IdNr.:</strong> [wird nach Erteilung ergänzt — falls nicht vorhanden entfällt
          die Angabe]
        </p>
        <p>
          <strong>Inhaltlich Verantwortlicher gemäß § 55 Abs. 2 RStV:</strong>{' '}
          [Name und Anschrift wie oben, nach Eintragung]
        </p>

        <h2>Haftung für Inhalte</h2>
        <p>
          Als Diensteanbieter sind wir gemäß § 7 Abs. 1 TMG für eigene Inhalte auf diesen Seiten nach
          den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir jedoch nicht
          verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach
          Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen. Verpflichtungen zur
          Entfernung oder Sperrung der Nutzung von Informationen nach den allgemeinen Gesetzen bleiben
          hiervon unberührt.
        </p>

        <h2>Haftung für Links</h2>
        <p>
          Unser Angebot enthält ggf. Links zu externen Websites Dritter, auf deren Inhalte wir keinen
          Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen.
          Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der
          Seiten verantwortlich.
        </p>

        <h2>Urheberrecht</h2>
        <p>
          Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem
          deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der
          Verwertung außerhalb der Grenzen des Urheberrechts bedürfen der schriftlichen Zustimmung des
          jeweiligen Autors bzw. Erstellers.
        </p>

        <h2>Hinweis zum Spielinhalt</h2>
        <p>
          <strong>Bundesrepublik / Politikpraxis</strong> ist eine fiktive Simulation. Dargestellte
          Parteien, Personen, Ereignisse und Organisationen sind — auch bei Anhaltspunkten an
          historische oder aktuelle Vorbilder — <strong>kein Abbild realer Personen oder Parteien</strong>{' '}
          und dienen ausschließlich dem Spiel und der Unterhaltung.
        </p>
      </div>
    </LegalPageShell>
  );
}
