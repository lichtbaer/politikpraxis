import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '../../../i18n';
import {
  deleteSaveSlot,
  getSaveBySlot,
  listSaves,
  serverDetailToSaveFile,
  type SaveListItem,
} from '../../../services/saves';
import type { SaveFile } from '../../../services/localStorageSave';
import styles from './SaveSlots.module.css';

interface SaveSlotsProps {
  token: string;
  onLoadSave: (save: SaveFile) => void;
  onListChange?: () => void;
}

export function SaveSlots({ token, onLoadSave, onListChange }: SaveSlotsProps) {
  const { t } = useTranslation();
  const [bySlot, setBySlot] = useState<Record<number, SaveListItem | undefined>>({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setErr(null);
    try {
      const list = await listSaves(token);
      const map: Record<number, SaveListItem> = {};
      for (const s of list) {
        map[s.slot] = s;
      }
      setBySlot(map);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Serverfehler');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleLoad = async (slot: number) => {
    setErr(null);
    try {
      const detail = await getSaveBySlot(token, slot);
      onLoadSave(serverDetailToSaveFile(detail));
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Laden fehlgeschlagen');
    }
  };

  const handleDelete = async (slot: number) => {
    setErr(null);
    try {
      await deleteSaveSlot(token, slot);
      await refresh();
      onListChange?.();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Löschen fehlgeschlagen');
    }
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString(i18n.language === 'de' ? 'de-DE' : 'en-US', {
        dateStyle: 'short',
        timeStyle: 'short',
      });
    } catch {
      return iso;
    }
  };

  if (loading) {
    return <p className={styles.hint}>{t('menu.cloudSavesLoading', { defaultValue: 'Spielstände werden geladen…' })}</p>;
  }

  return (
    <div className={styles.wrap}>
      <h3 className={styles.heading}>{t('menu.cloudSavesTitle', { defaultValue: 'Cloud-Spielstände' })}</h3>
      {err && <p className={styles.error}>{err}</p>}
      <div className={styles.grid}>
        {[1, 2, 3].map((slot) => {
          const save = bySlot[slot];
          return (
            <div key={slot} className={styles.slot}>
              <div className={styles.slotHead}>
                {t('menu.saveSlotLabel', { defaultValue: 'Slot {{slot}}', slot })}
              </div>
              {save ? (
                <>
                  <div className={styles.line}>
                    <strong>{save.name?.trim() || `Slot ${slot}`}</strong>
                  </div>
                  <div className={styles.line}>
                    {(save.partei ?? '—')}{' '}
                    · {t('menu.saveMonthShort', { defaultValue: 'Monat {{m}}/48', m: save.monat ?? '—' })}
                  </div>
                  <div className={styles.line}>
                    {t('menu.saveWahlprognose', {
                      defaultValue: 'Wahlprognose: {{v}}%',
                      v: save.wahlprognose != null ? Math.round(save.wahlprognose) : '—',
                    })}
                  </div>
                  <div className={styles.meta}>
                    {t('menu.saveUpdated', { defaultValue: 'Zuletzt: {{d}}', d: formatDate(save.updated_at) })}
                  </div>
                  <div className={styles.actions}>
                    <button type="button" className={styles.btnLoad} onClick={() => void handleLoad(slot)}>
                      {t('menu.loadGame')}
                    </button>
                    <button type="button" className={styles.btnDel} onClick={() => void handleDelete(slot)}>
                      {t('menu.deleteSave', { defaultValue: 'Löschen' })}
                    </button>
                  </div>
                </>
              ) : (
                <span className={styles.empty}>{t('menu.emptySlot', { defaultValue: 'Leerer Slot' })}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
