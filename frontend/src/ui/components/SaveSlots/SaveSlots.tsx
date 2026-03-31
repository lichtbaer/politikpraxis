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
import { toBcp47 } from '../../lib/locale';
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
      setErr(e instanceof Error ? e.message : t('menu.serverError'));
    } finally {
      setLoading(false);
    }
  }, [token, t]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleLoad = async (slot: number) => {
    setErr(null);
    try {
      const detail = await getSaveBySlot(token, slot);
      onLoadSave(serverDetailToSaveFile(detail));
    } catch (e) {
      setErr(e instanceof Error ? e.message : t('menu.loadFailed'));
    }
  };

  const handleDelete = async (slot: number) => {
    setErr(null);
    try {
      await deleteSaveSlot(token, slot);
      await refresh();
      onListChange?.();
    } catch (e) {
      setErr(e instanceof Error ? e.message : t('menu.deleteFailed'));
    }
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString(toBcp47(i18n.language), {
        dateStyle: 'short',
        timeStyle: 'short',
      });
    } catch {
      return iso;
    }
  };

  if (loading) {
    return <p className={styles.hint}>{t('menu.cloudSavesLoading')}</p>;
  }

  return (
    <div className={styles.wrap}>
      <h3 className={styles.heading}>{t('menu.cloudSavesTitle')}</h3>
      {err && <p className={styles.error}>{err}</p>}
      <div className={styles.grid}>
        {[1, 2, 3].map((slot) => {
          const save = bySlot[slot];
          return (
            <div key={slot} className={styles.slot}>
              <div className={styles.slotHead}>
                {t('menu.saveSlotLabel', { slot })}
              </div>
              {save ? (
                <>
                  <div className={styles.line}>
                    <strong>{save.name?.trim() || `Slot ${slot}`}</strong>
                  </div>
                  <div className={styles.line}>
                    {(save.partei ?? '—')}{' '}
                    · {t('menu.saveMonthShort', { m: save.monat ?? '—' })}
                  </div>
                  <div className={styles.line}>
                    {t('menu.saveVote', {
                      v: save.wahlprognose != null ? Math.round(save.wahlprognose) : '—',
                    })}
                  </div>
                  <div className={styles.meta}>
                    {t('menu.saveUpdated', { d: formatDate(save.updated_at) })}
                  </div>
                  <div className={styles.actions}>
                    <button type="button" className={styles.btnLoad} onClick={() => void handleLoad(slot)}>
                      {t('menu.loadGame')}
                    </button>
                    <button type="button" className={styles.btnDel} onClick={() => void handleDelete(slot)}>
                      {t('menu.deleteSave')}
                    </button>
                  </div>
                </>
              ) : (
                <span className={styles.empty}>{t('menu.emptySlot')}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
