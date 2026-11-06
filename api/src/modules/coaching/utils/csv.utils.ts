// CSV helpers for coaching exports (§10.1g): UTF-8 BOM so Excel opens files correctly, and protection
// against spreadsheet formula injection.

export const CSV_BOM = '﻿';
const FORMULA_START = /^[=+\-@\t\r]/;

export const escapeCsvCell = (value: unknown): string => {
  if (value == null) return '';
  let text =
    value instanceof Date ? value.toISOString() : String(value);
  // A cell starting with = + - @ would be evaluated by spreadsheets: prefix it so it stays text.
  if (FORMULA_START.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export const toCsvRow = (cells: unknown[]): string =>
  `${cells.map(escapeCsvCell).join(',')}\r\n`;
