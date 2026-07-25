import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
  const queryClient = useQueryClient();
  const queryKey = ['saves', token] as const;
  const [actionErr, setActionErr] = useState<string | null>(null);

  const {
    data: list,
    isLoading,
    error: listError,
  } = useQuery({
    queryKey,
    queryFn: () => listSaves(token),
  });

  const deleteMutation = useMutation({
    mutationFn: (slot: number) => deleteSaveSlot(token, slot),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey });
      onListChange?.();
    },
    onError: (e) => setActionErr(e instanceof Error ? e.message : t('menu.deleteFailed')),
  });

  const bySlot: Record<number, SaveListItem | undefined> = {};
  for (const s of list ?? []) {
    bySlot[s.slot] = s;
  }

  const err =
    actionErr ??
    (listError ? (listError instanceof Error ? listError.message : t('menu.serverError')) : null);

  const handleLoad = async (slot: number) => {
    setActionErr(null);
    try {
      const detail = await getSaveBySlot(token, slot);
      onLoadSave(serverDetailToSaveFile(detail));
    } catch (e) {
      setActionErr(e instanceof Error ? e.message : t('menu.loadFailed'));
    }
  };

  const handleDelete = (slot: number) => {
    setActionErr(null);
    deleteMutation.mutate(slot);
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

  if (isLoading) {
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
                    <button type="button" className={styles.btnDel} onClick={() => handleDelete(slot)}>
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
