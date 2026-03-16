import { apiFetch } from './api';
import type { ContentBundle } from '../core/types';

export async function fetchContentBundle(scenarioId: string = 'standard'): Promise<ContentBundle> {
  return apiFetch<ContentBundle>(`/content/bundle?scenario_id=${scenarioId}`);
}

export async function fetchScenarios(): Promise<Array<{ id: string; name: string; description: string }>> {
  return apiFetch('/content/scenarios');
}
