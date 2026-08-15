function triggerDownload(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function downloadJson(filename: string, data: unknown) {
  triggerDownload(
    filename,
    new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
  );
}

function csvCell(value: unknown) {
  const text = value == null ? '' : String(value);
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function downloadCsv(
  filename: string,
  headers: string[],
  rows: Record<string, unknown>[],
) {
  const lines = [
    headers.join(','),
    ...rows.map((row) => headers.map((key) => csvCell(row[key])).join(',')),
  ];
  triggerDownload(
    filename,
    new Blob([`\uFEFF${lines.join('\n')}`], { type: 'text/csv;charset=utf-8' }),
  );
}

export function parseCsv(text: string): Record<string, string>[] {
  const raw = text.replace(/^\uFEFF/, '').trim();
  if (!raw) return [];
  const lines = raw.split(/\r?\n/);
  const headers = splitCsvLine(lines[0] ?? '');
  return lines.slice(1).filter(Boolean).map((line) => {
    const cells = splitCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = cells[index] ?? '';
    });
    return row;
  });
}

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      cells.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  cells.push(current);
  return cells;
}

export function csvToImportPayload(
  filename: string,
  rows: Record<string, string>[],
): Record<string, unknown> {
  const lower = filename.toLowerCase();
  if (lower.includes('account')) return { accounts: rows };
  if (lower.includes('transfer')) return { transfers: rows };
  if (lower.includes('trade')) return { trades: rows };
  if (lower.includes('dividend')) return { dividends: rows };
  if (lower.includes('cash')) return { cashEntries: rows };
  const headers = Object.keys(rows[0] ?? {});
  if (headers.includes('thbAmount') && headers.includes('usdAmount')) {
    return { transfers: rows };
  }
  if (headers.includes('side') && headers.includes('priceUsd')) {
    return { trades: rows };
  }
  if (headers.includes('grossUsd') || headers.includes('netUsd')) {
    return { dividends: rows };
  }
  if (headers.includes('amount') && headers.includes('direction')) {
    return { cashEntries: rows };
  }
  if (headers.includes('kind') && headers.includes('name')) {
    return { accounts: rows };
  }
  throw new Error('ไม่รู้จักชนิด CSV — ตั้งชื่อไฟล์แบบ accounts/transfers/trades/dividends/cash-entries');
}
