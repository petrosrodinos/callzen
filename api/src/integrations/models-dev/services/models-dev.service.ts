import { Injectable, Logger } from '@nestjs/common';
import {
  ModelsDevCatalog,
  ModelsDevFetchResult,
  ModelsDevModelSchema,
} from '../interfaces/models-dev.interface';

export const MODELS_DEV_URL = 'https://models.dev/api.json';
const FETCH_TIMEOUT_MS = 30_000;

// Thin client for models.dev (MIT licensed, no API key). Only parses the providers that are asked for, since
// the full document lists hundreds of providers (~6 MB).
@Injectable()
export class ModelsDevService {
  private readonly logger = new Logger(ModelsDevService.name);

  async fetchCatalog(
    providers: string[],
    etag?: string | null,
  ): Promise<ModelsDevFetchResult> {
    const response = await fetch(MODELS_DEV_URL, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'callzen-pricing-sync',
        ...(etag && { 'If-None-Match': etag }),
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (response.status === 304)
      return { catalog: null, notModified: true, etag: etag ?? null, skippedModels: 0 };
    if (!response.ok)
      throw new Error(`models.dev responded ${response.status}`);

    const raw = (await response.json()) as Record<string, unknown>;
    if (!raw || typeof raw !== 'object')
      throw new Error('models.dev returned an unexpected document');

    const catalog: ModelsDevCatalog = {};
    let skippedModels = 0;
    for (const providerId of new Set(providers)) {
      const provider = raw[providerId] as
        | { models?: Record<string, unknown> }
        | undefined;
      if (!provider?.models || typeof provider.models !== 'object') continue;

      const models: ModelsDevCatalog[string]['models'] = {};
      for (const [modelId, value] of Object.entries(provider.models)) {
        const parsed = ModelsDevModelSchema.safeParse({ id: modelId, ...(value as object) });
        if (parsed.success) models[modelId] = parsed.data;
        else skippedModels += 1;
      }
      catalog[providerId] = { id: providerId, models };
    }

    if (skippedModels)
      this.logger.warn(`models.dev: skipped ${skippedModels} malformed model(s)`);
    return {
      catalog,
      notModified: false,
      etag: response.headers.get('etag'),
      skippedModels,
    };
  }
}
