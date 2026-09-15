// CSV parsing and validation for catalogue import.
//
// Kept as a plain module — no 'use server', no 'use client' — because the SAME
// function has to run in the preview and again in the apply. Apply never trusts
// the diff the browser sends back; it re-parses the raw CSV server-side and
// re-derives everything. Otherwise a tampered preview payload could write a
// price nobody reviewed.

export const COLUMNS = [
  'name',
  'category',
  'price',
  'description',
  'is_active',
  'requires_prescription',
] as const;

export type ParsedRow = {
  line: number;
  name: string;
  category: string;
  price: number;
  description: string | null;
  isActive: boolean;
  requiresPrescription: boolean;
};

export type ParseResult = {
  rows: ParsedRow[];
  errors: { line: number; message: string }[];
};

/**
 * A deliberately small CSV reader: quoted fields with escaped doubled quotes,
 * commas and newlines inside quotes. No streaming, no dialect detection.
 *
 * ponytail: whole file in memory, single pass. A partner catalogue is hundreds
 * of rows, not millions; swap for a streaming parser only if that stops being
 * true.
 */
function splitRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];

    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      quoted = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      // Push the row on the first terminator and swallow a following \n so CRLF
      // does not produce a phantom blank row.
      if (ch === '\r' && text[i + 1] === '\n') i += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ''));
}

function parseBool(raw: string, fallback: boolean) {
  const v = raw.trim().toLowerCase();
  if (v === '') return fallback;
  if (['true', 'yes', 'y', '1'].includes(v)) return true;
  if (['false', 'no', 'n', '0'].includes(v)) return false;
  return null;
}

export function parseCatalogueCsv(text: string, validCategories: Set<string>): ParseResult {
  const grid = splitRows(text);
  const errors: { line: number; message: string }[] = [];

  if (grid.length === 0) return { rows: [], errors: [{ line: 0, message: 'The file is empty.' }] };

  const header = grid[0].map((h) => h.trim().toLowerCase());
  const missing = COLUMNS.filter((c) => !header.includes(c));
  if (missing.length > 0) {
    return {
      rows: [],
      errors: [
        {
          line: 1,
          message: `Missing column${missing.length === 1 ? '' : 's'}: ${missing.join(', ')}. Expected header: ${COLUMNS.join(',')}`,
        },
      ],
    };
  }
  const at = (cells: string[], col: (typeof COLUMNS)[number]) => cells[header.indexOf(col)] ?? '';

  const rows: ParsedRow[] = [];
  const seen = new Map<string, number>();

  grid.slice(1).forEach((cells, index) => {
    const line = index + 2; // 1-based, and the header is line 1.
    const name = at(cells, 'name').trim();
    const category = at(cells, 'category').trim().toLowerCase();
    const priceRaw = at(cells, 'price').trim();

    if (!name) {
      errors.push({ line, message: 'Name is required.' });
      return;
    }

    // Duplicate names within one file are rejected rather than last-one-wins:
    // the database has a unique index on (vendor_org_id, lower(name)), so
    // silently picking one would make the import non-deterministic.
    const key = name.toLowerCase();
    const first = seen.get(key);
    if (first !== undefined) {
      errors.push({ line, message: `"${name}" already appears on line ${first}.` });
      return;
    }
    seen.set(key, line);

    if (!validCategories.has(category)) {
      errors.push({
        line,
        message: `Unknown category "${category || '(blank)'}". Use one of: ${[...validCategories].join(', ')}`,
      });
      return;
    }

    const price = Number(priceRaw);
    if (!priceRaw || !Number.isFinite(price) || price < 0) {
      errors.push({ line, message: `Price "${priceRaw}" is not a non-negative number.` });
      return;
    }
    if (Math.round(price * 100) !== price * 100) {
      errors.push({ line, message: `Price ${price} has more than two decimal places.` });
      return;
    }

    const isActive = parseBool(at(cells, 'is_active'), true);
    const requiresPrescription = parseBool(at(cells, 'requires_prescription'), false);
    if (isActive === null || requiresPrescription === null) {
      errors.push({ line, message: 'is_active and requires_prescription must be true/false (or blank).' });
      return;
    }

    rows.push({
      line,
      name,
      category,
      price,
      description: at(cells, 'description').trim() || null,
      isActive,
      requiresPrescription,
    });
  });

  return { rows, errors };
}
