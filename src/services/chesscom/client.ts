import {
  CHESSCOM_ARCHIVE_DELAY_MS,
  CHESSCOM_BACKOFF_BASE_MS,
  CHESSCOM_MAX_RETRIES,
} from '../../constants/chesscom';
import type {
  ChessComArchivesResponse,
  ChessComGamesResponse,
  ChessComGame,
} from './types';

const PROD_BASE = 'https://api.chess.com/pub';
const PROXY_BASE = '/api/chesscom';

export function chessComBaseUrl(): string {
  return PROXY_BASE;
}

export function toFetchUrl(urlOrPath: string): string {
  if (urlOrPath.startsWith('http')) {
    return urlOrPath.replace(`${PROD_BASE}`, PROXY_BASE);
  }
  const path = urlOrPath.startsWith('/') ? urlOrPath : `/${urlOrPath}`;
  return `${chessComBaseUrl()}${path}`;
}

/** True when the app is not using the dev/preview Vite proxy for Chess.com. */
export function chessComProxyUnavailable(): boolean {
  return !import.meta.env.DEV && import.meta.env.MODE === 'production';
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class ChessComFetchError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly kind: 'network' | 'not_found' | 'rate_limit' | 'cors' | 'unknown' = 'unknown',
  ) {
    super(message);
    this.name = 'ChessComFetchError';
  }
}

async function fetchJson<T>(url: string, attempt = 0, signal?: AbortSignal): Promise<T> {
  let response: Response;
  try {
    response = await fetch(toFetchUrl(url), { signal });
  } catch (err) {
    if (signal?.aborted) {
      throw err;
    }
    throw new ChessComFetchError(
      chessComProxyUnavailable()
        ? 'Chess.com proxy not configured — run via npm run dev or npm run preview (see SETUP.md).'
        : 'Could not reach Chess.com — start the dev server with proxy enabled (see SETUP.md).',
      undefined,
      'cors',
    );
  }

  if (response.status === 404) {
    throw new ChessComFetchError('Username not found on Chess.com', 404, 'not_found');
  }

  if (response.status === 429) {
    if (attempt < CHESSCOM_MAX_RETRIES) {
      const backoff = CHESSCOM_BACKOFF_BASE_MS * 2 ** attempt;
      await delay(backoff);
      return fetchJson<T>(url, attempt + 1, signal);
    }
    throw new ChessComFetchError(
      'Chess.com asked to slow down — try again in a minute.',
      429,
      'rate_limit',
    );
  }

  if (!response.ok) {
    throw new ChessComFetchError(
      `Chess.com request failed (${response.status})`,
      response.status,
      'unknown',
    );
  }

  return (await response.json()) as T;
}

export async function verifyPlayer(username: string): Promise<boolean> {
  await fetchJson(`${chessComBaseUrl()}/player/${encodeURIComponent(username)}`);
  return true;
}

export async function fetchArchives(username: string): Promise<string[]> {
  const data = await fetchJson<ChessComArchivesResponse>(
    `${chessComBaseUrl()}/player/${encodeURIComponent(username)}/games/archives`,
  );
  return [...data.archives].sort((a, b) => b.localeCompare(a));
}

export async function fetchMonthlyGames(
  archiveUrl: string,
  signal?: AbortSignal,
): Promise<ChessComGame[]> {
  const data = await fetchJson<ChessComGamesResponse>(archiveUrl, 0, signal);
  return data.games ?? [];
}

export async function fetchGamesForMonths(
  username: string,
  months: number,
  onProgress?: (current: number, total: number) => void,
  signal?: AbortSignal,
): Promise<ChessComGame[]> {
  const archives = await fetchArchives(username);
  if (signal?.aborted) {
    throw new DOMException('Fetch cancelled.', 'AbortError');
  }
  const selected = archives.slice(0, Math.max(1, months));
  const allGames: ChessComGame[] = [];

  for (let i = 0; i < selected.length; i += 1) {
    if (signal?.aborted) {
      throw new DOMException('Fetch cancelled.', 'AbortError');
    }
    if (i > 0) {
      await delay(CHESSCOM_ARCHIVE_DELAY_MS);
    }
    onProgress?.(i, selected.length);
    const games = await fetchMonthlyGames(selected[i]!, signal);
    allGames.push(...games);
  }

  onProgress?.(selected.length, selected.length);
  return allGames;
}
