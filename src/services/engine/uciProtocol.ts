import { parseUciScoreCp } from '../../utils/evalScore';

export type UciEngineEvent =
  | { type: 'info'; depth: number; scoreCp: number; pv: string[] }
  | { type: 'bestmove'; uci: string; ponder?: string }
  | { type: 'uciok' }
  | { type: 'ready' }
  | { type: 'error'; message: string };

export function parseUciLines(raw: unknown): UciEngineEvent[] {
  const text = typeof raw === 'string' ? raw : String(raw ?? '');
  const events: UciEngineEvent[] = [];

  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }

    if (trimmed === 'uciok') {
      events.push({ type: 'uciok' });
      continue;
    }

    if (trimmed === 'readyok') {
      events.push({ type: 'ready' });
      continue;
    }

    if (trimmed.startsWith('info ')) {
      const info = parseInfoLine(trimmed);
      if (info) {
        events.push(info);
      }
      continue;
    }

    if (trimmed.startsWith('bestmove ')) {
      const parts = trimmed.split(/\s+/);
      const uci = parts[1];
      if (uci) {
        events.push({
          type: 'bestmove',
          uci,
          ponder: parts[3],
        });
      }
    }
  }

  return events;
}

function parseInfoLine(line: string): UciEngineEvent | null {
  const parts = line.split(/\s+/);
  let depth = 0;
  let scoreCp: number | null = null;
  let pv: string[] = [];

  for (let i = 0; i < parts.length; i += 1) {
    if (parts[i] === 'depth' && parts[i + 1]) {
      depth = Number.parseInt(parts[i + 1], 10);
    }
    if (parts[i] === 'score') {
      scoreCp = parseUciScoreCp(parts, i);
    }
    if (parts[i] === 'pv') {
      pv = parts.slice(i + 1);
      break;
    }
  }

  if (depth > 0 && scoreCp !== null) {
    return { type: 'info', depth, scoreCp, pv };
  }

  return null;
}
