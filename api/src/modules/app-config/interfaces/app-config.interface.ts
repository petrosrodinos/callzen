import { AppConfigCategory } from '../registry/app-config.types';

export interface AppConfigEntry {
  key: string;
  category: AppConfigCategory;
  description: string;
  public: boolean;
  value: unknown;
  default: unknown;
  // 0 = never stored (the default is served).
  version: number;
  // The stored value no longer matches the schema; the default is being served.
  invalid: boolean;
  validation_error: string | null;
  updated_at: Date | null;
  updated_by: { id: string; name: string } | null;
}

export interface AppConfigHistoryEntry {
  id: string;
  key: string;
  old_value: unknown;
  new_value: unknown;
  changed_by: { id: string; name: string | null } | null;
  created_at: Date;
}
