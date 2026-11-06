import { z } from 'zod';

// Lenient schemas: unknown fields are ignored, and a malformed model or provider is skipped rather than
// failing the whole sync.
const finite = z.number().finite().nonnegative();

export const ModelsDevCostSchema = z
  .object({
    input: finite.optional(),
    output: finite.optional(),
    cache_read: finite.optional(),
    cache_write: finite.optional(),
    reasoning: finite.optional(),
    input_audio: finite.optional(),
    output_audio: finite.optional(),
  })
  .loose();
export type ModelsDevCost = z.infer<typeof ModelsDevCostSchema>;

export const ModelsDevModelSchema = z
  .object({
    id: z.string(),
    name: z.string().optional(),
    reasoning: z.boolean().optional(),
    modalities: z
      .object({
        input: z.array(z.string()).optional(),
        output: z.array(z.string()).optional(),
      })
      .loose()
      .optional(),
    cost: ModelsDevCostSchema.optional(),
  })
  .loose();
export type ModelsDevModel = z.infer<typeof ModelsDevModelSchema>;

export interface ModelsDevProvider {
  id: string;
  models: Record<string, ModelsDevModel>;
}

// providerId -> provider, with only the models that parsed.
export type ModelsDevCatalog = Record<string, ModelsDevProvider>;

export interface ModelsDevFetchResult {
  catalog: ModelsDevCatalog | null;
  // True when the server answered 304 Not Modified.
  notModified: boolean;
  etag: string | null;
  skippedModels: number;
}
