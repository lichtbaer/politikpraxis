import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X as XIcon } from '../../icons';
import styles from './Glossar.module.css';

type GlossarCategory = 'grundlagen' | 'haushalt' | 'koalition' | 'medien';

interface GlossarEntry {
  key: string;
  category: GlossarCategory;
}

const GLOSSAR_KEYS: GlossarEntry[] = [
  { key: 'pk', category: 'grundlagen' },
  { key: 'zustimmung', category: 'grundlagen' },
  { key: 'kongruenz', category: 'grundlagen' },
  { key: 'arbeitslosigkeit', category: 'grundlagen' },
  { key: 'haushaltssaldo', category: 'haushalt' },
  { key: 'gini', category: 'grundlagen' },
  { key: 'zufriedenheit', category: 'grundlagen' },
  { key: 'koalition', category: 'koalition' },
  { key: 'spielraum', category: 'haushalt' },
  { key: 'schuldenbremse', category: 'haushalt' },
  { key: 'medienklima', category: 'medien' },
  { key: 'milieus', category: 'grundlagen' },
  { key: 'kvScore', category: 'koalition' },
  { key: 'vorstufen', category: 'grundlagen' },
  { key: 'bundesrat', category: 'grundlagen' },
];

const CATEGORIES: GlossarCategory[] = ['grundlagen', 'haushalt', 'koalition', 'medien'];

interface GlossarProps {
  onClose: () => void;
}

export function Glossar({ onClose }: GlossarProps) {
  const { t } = useTranslation('game');
  const [filter, setFilter] = useState<GlossarCategory | 'alle'>('alle');
  const [searchQuery, setSearchQuery] = useState('');

  const entries = GLOSSAR_KEYS.map((e) => ({
    ...e,
    term: t(`glossar.entries.${e.key}.term`),
    explanation: t(`glossar.entries.${e.key}.explanation`),
  }));

  const filtered = entries.filter(e => {
    if (filter !== 'alle' && e.category !== filter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return e.term.toLowerCase().includes(q) || e.explanation.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <header className={styles.header}>
          <h2 className={styles.title}>{t('glossar.title')}</h2>
          <button type="button" className={styles.closeBtn} onClick={onClose}><XIcon size={16} /></button>
        </header>
        <div className={styles.searchRow}>
          <input
            type="text"
            className={styles.searchInput}
            placeholder={t('glossar.searchPlaceholder')}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            autoFocus
          />
        </div>
        <div className={styles.filters}>
          <button
            type="button"
            className={`${styles.filterBtn} ${filter === 'alle' ? styles.filterActive : ''}`}
            onClick={() => setFilter('alle')}
          >
            {t('glossar.all')}
          </button>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              type="button"
              className={`${styles.filterBtn} ${filter === cat ? styles.filterActive : ''}`}
              onClick={() => setFilter(cat)}
            >
              {t(`glossar.categories.${cat}`)}
            </button>
          ))}
        </div>
        <div className={styles.entries}>
          {filtered.map(entry => (
            <div key={entry.key} className={styles.entry}>
              <dt className={styles.term}>{entry.term}</dt>
              <dd className={styles.explanation}>{entry.explanation}</dd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
