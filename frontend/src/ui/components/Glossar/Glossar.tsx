import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './Glossar.module.css';

interface GlossarEntry {
  term: string;
  explanation: string;
  category: 'grundlagen' | 'haushalt' | 'koalition' | 'medien';
}

const GLOSSAR_ENTRIES: GlossarEntry[] = [
  { term: 'Politisches Kapital (PK)', explanation: 'Deine Handlungsressource. Jede Aktion kostet PK. Regeneriert monatlich basierend auf deiner Zustimmung.', category: 'grundlagen' },
  { term: 'Zustimmung / Wahlprognose', explanation: 'Wie beliebt deine Regierung ist. Am Ende der Legislatur (Monat 48) musst du die Wahlhürde überschreiten um zu gewinnen.', category: 'grundlagen' },
  { term: 'Kongruenz', explanation: 'Wie gut ein Gesetz zu deiner ideologischen Ausrichtung passt (0–100%). Hohe Kongruenz = weniger PK-Kosten, niedrige Kongruenz = mehr Aufwand und Widerstand.', category: 'grundlagen' },
  { term: 'Arbeitslosigkeit', explanation: 'KPI: Arbeitslosenquote in %. Niedrig = gut. Wird durch Konjunkturdrift und Gesetze beeinflusst.', category: 'grundlagen' },
  { term: 'Haushaltssaldo', explanation: 'KPI: Einnahmen minus Ausgaben in %. Positiv = Überschuss. Negativ = Defizit. Beeinflusst durch Gesetze und Konjunktur.', category: 'haushalt' },
  { term: 'Gini-Index', explanation: 'KPI: Maß für Ungleichheit (0–100). Niedrig = weniger Ungleichheit. Beeinflusst durch Sozialpolitik.', category: 'grundlagen' },
  { term: 'Zufriedenheit', explanation: 'KPI: Allgemeine Bevölkerungszufriedenheit (0–100%). Hoch = gut. Wird durch alle KPIs und Gesetze beeinflusst.', category: 'grundlagen' },
  { term: 'Koalitionsstabilität', explanation: 'Wie stabil deine Regierungskoalition ist (0–100%). Berechnet aus Kabinett-Stimmung und Partner-Loyalität. Unter 15% → Koalitionsbruch = Spielverlust!', category: 'koalition' },
  { term: 'Spielraum', explanation: 'Haushaltsmittel, die für neue Gesetze verfügbar sind. Ergibt sich aus Einnahmen minus Pflichtausgaben minus laufende Kosten.', category: 'haushalt' },
  { term: 'Schuldenbremse', explanation: 'Ab Stufe 3: Verfassungsgrenze für Neuverschuldung. Bei Verletzung drohen Sparmaßnahmen und Vertrauensverlust.', category: 'haushalt' },
  { term: 'Medienklima', explanation: 'Wie positiv die Medienberichterstattung ist (0–100). Beeinflusst PK-Kosten für Gesetze und Wahlkampf-Erfolg.', category: 'medien' },
  { term: 'Milieus', explanation: 'Wählergruppen mit unterschiedlichen ideologischen Profilen. Ihre Zustimmung bestimmt deine Wahlprognose.', category: 'grundlagen' },
  { term: 'Koalitionsvertrag-Score', explanation: 'Wie viele Punkte des Koalitionsvertrags erfüllt sind. Hoher Score = stabilere Koalition, niedriger Score = Partner wird unzufrieden.', category: 'koalition' },
  { term: 'Vorstufen', explanation: 'Kommunal- oder Länderpiloten vor dem Einbringen eines Gesetzes. Geben Boni auf BT-Stimmen, PK-Kosten und Bundesrat-Zustimmung.', category: 'grundlagen' },
  { term: 'Bundesrat', explanation: '4 Fraktionen vertreten 16 Bundesländer. Gesetze mit Land-Tag benötigen Bundesrats-Mehrheit. Beziehungspflege und Lobbying beeinflussen die Abstimmung.', category: 'grundlagen' },
];

const CATEGORY_LABELS: Record<GlossarEntry['category'], string> = {
  grundlagen: 'Grundlagen',
  haushalt: 'Haushalt',
  koalition: 'Koalition',
  medien: 'Medien & Öffentlichkeit',
};

interface GlossarProps {
  onClose: () => void;
}

export function Glossar({ onClose }: GlossarProps) {
  const { t } = useTranslation('game');
  const [filter, setFilter] = useState<GlossarEntry['category'] | 'alle'>('alle');

  const filtered = filter === 'alle'
    ? GLOSSAR_ENTRIES
    : GLOSSAR_ENTRIES.filter(e => e.category === filter);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <header className={styles.header}>
          <h2 className={styles.title}>{t('glossar.title', 'Glossar')}</h2>
          <button type="button" className={styles.closeBtn} onClick={onClose}>✕</button>
        </header>
        <div className={styles.filters}>
          <button
            type="button"
            className={`${styles.filterBtn} ${filter === 'alle' ? styles.filterActive : ''}`}
            onClick={() => setFilter('alle')}
          >
            Alle
          </button>
          {(Object.keys(CATEGORY_LABELS) as GlossarEntry['category'][]).map(cat => (
            <button
              key={cat}
              type="button"
              className={`${styles.filterBtn} ${filter === cat ? styles.filterActive : ''}`}
              onClick={() => setFilter(cat)}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>
        <div className={styles.entries}>
          {filtered.map(entry => (
            <div key={entry.term} className={styles.entry}>
              <dt className={styles.term}>{entry.term}</dt>
              <dd className={styles.explanation}>{entry.explanation}</dd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
