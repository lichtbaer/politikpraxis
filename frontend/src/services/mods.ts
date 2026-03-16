import { apiFetch } from './api';
import type { ContentBundle } from '../core/types';

interface ModInfo {
  id: string;
  author_id: string;
  title: string;
  description: string;
  version: string;
  downloads: number;
  created_at: string;
}

interface ModDetail extends ModInfo {
  content: Partial<ContentBundle>;
}

export async function listMods(): Promise<ModInfo[]> {
  return apiFetch<ModInfo[]>('/mods');
}

export async function getMod(modId: string): Promise<ModDetail> {
  return apiFetch<ModDetail>(`/mods/${modId}`);
}

export async function getModContent(modId: string): Promise<Partial<ContentBundle>> {
  return apiFetch<Partial<ContentBundle>>(`/mods/${modId}/content`);
}

export async function uploadMod(
  token: string,
  title: string,
  description: string,
  content: Partial<ContentBundle>,
): Promise<ModInfo> {
  return apiFetch<ModInfo>('/mods', {
    method: 'POST',
    token,
    body: { title, description, content, version: '1.0.0' },
  });
}

export function mergeModContent(base: ContentBundle, mod: Partial<ContentBundle>): ContentBundle {
  return {
    ...base,
    characters: mod.characters ?? base.characters,
    events: mod.events ? [...base.events, ...mod.events] : base.events,
    charEvents: mod.charEvents ? { ...base.charEvents, ...mod.charEvents } : base.charEvents,
    bundesratEvents: mod.bundesratEvents ?? base.bundesratEvents,
    laws: mod.laws ? [...base.laws, ...mod.laws] : base.laws,
    bundesrat: mod.bundesrat ?? base.bundesrat,
    bundesratFraktionen: mod.bundesratFraktionen ?? base.bundesratFraktionen,
    scenario: mod.scenario ?? base.scenario,
  };
}
