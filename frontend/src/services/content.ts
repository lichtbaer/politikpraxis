import { apiFetch } from './api';
import type { ContentBundle } from '../core/types';

export async function fetchContentBundle(
  scenarioId: string = 'standard',
  locale: string = 'de',
): Promise<ContentBundle> {
  return apiFetch<ContentBundle>(
    `/content/bundle?scenario_id=${encodeURIComponent(scenarioId)}&locale=${encodeURIComponent(locale)}`,
  );
}

export async function fetchScenarios(): Promise<Array<{ id: string; name: string; description: string }>> {
  return apiFetch('/content/scenarios');
}
