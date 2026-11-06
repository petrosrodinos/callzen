const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

// Adds fields that exist in `defaults` but not in `stored`, recursively. Existing values (including admin
// edits) are never changed. Arrays and primitives are kept as stored.
export const mergeMissingDefaults = (
  stored: unknown,
  defaults: unknown,
): unknown => {
  if (!isPlainObject(stored) || !isPlainObject(defaults)) return stored;
  const result: Record<string, unknown> = { ...stored };
  for (const [key, defaultValue] of Object.entries(defaults)) {
    result[key] =
      key in stored
        ? mergeMissingDefaults(stored[key], defaultValue)
        : defaultValue;
  }
  return result;
};

export const jsonEqual = (a: unknown, b: unknown): boolean =>
  JSON.stringify(a) === JSON.stringify(b);
