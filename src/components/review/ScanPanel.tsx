import { useGameScan } from '../../hooks/useGameScan';
import { useAppContext } from '../../context/AppContext';
import { useEngineControl } from '../../context/EngineContext';
import { chessComProxyUnavailable } from '../../services/chesscom/client';

const ENGINE_STATUS_LABEL: Record<string, string> = {
  idle: 'Starting engine…',
  ready: 'Engine ready',
  thinking: 'Engine thinking',
  error: 'Engine error',
};

export function ScanPanel() {
  const { settings } = useAppContext();
  const { engineStatus, engineError } = useEngineControl();
  const {
    scanGames,
    cancelScan,
    isScanning,
    progress,
    lastResult,
    error,
    usedFixture,
    fetchProgress,
    isLoading,
  } = useGameScan();

  const lastScan = settings.chesscom.lastScanAt
    ? new Date(settings.chesscom.lastScanAt).toLocaleString()
    : 'Never';

  const progressPct =
    progress && progress.gamesTotal > 0
      ? Math.round((progress.gamesDone / progress.gamesTotal) * 100)
      : 0;

  const engineReady = engineStatus === 'ready';
  const scanDisabled =
    isScanning ||
    isLoading ||
    !engineReady ||
    !settings.chesscom.username.trim();

  return (
    <div className="space-y-4 rounded-lg border border-slate-800 bg-slate-900/50 p-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-slate-400">
            Username:{' '}
            <span className="text-white">
              {settings.chesscom.username || '(not set)'}
            </span>
          </p>
          <p className="text-sm text-slate-400">
            Months: {settings.chesscom.defaultMonthsToFetch} · Last scan: {lastScan}
          </p>
          <p className="text-sm text-slate-400">
            Engine:{' '}
            <span
              className={
                engineStatus === 'ready'
                  ? 'text-emerald-400'
                  : engineStatus === 'error'
                    ? 'text-red-400'
                    : 'text-amber-300'
              }
            >
              {ENGINE_STATUS_LABEL[engineStatus] ?? engineStatus}
            </span>
          </p>
        </div>
        <div className="flex gap-2">
          {isScanning && (
            <button
              type="button"
              onClick={cancelScan}
              className="rounded-md border border-slate-600 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800"
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={() => void scanGames()}
            disabled={scanDisabled}
            className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
          >
            {isScanning ? 'Scanning…' : 'Scan games'}
          </button>
        </div>
      </div>

      {isScanning && progress && (
        <div>
          <div className="mb-1 flex justify-between text-xs text-slate-400">
            <span>
              Game {progress.gamesDone}/{progress.gamesTotal}
            </span>
            <span>
              {progress.newBlunders} blunders · {progress.newConversions} conversions
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full bg-emerald-600 transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      {fetchProgress && isLoading && (
        <p className="text-sm text-slate-400">
          Fetching archives {fetchProgress.current + 1}/{fetchProgress.total}…
        </p>
      )}

      {error && (
        <p className="text-sm text-amber-300">{error}</p>
      )}

      {engineError && engineStatus === 'error' && (
        <p className="text-sm text-red-300">{engineError}</p>
      )}

      {chessComProxyUnavailable() && (
        <p className="text-sm text-amber-200">
          Production build requires the Chess.com proxy — use npm run dev or npm run preview
          (see SETUP.md).
        </p>
      )}

      {usedFixture && (
        <p className="text-sm text-slate-400">
          Using seeded test games (API unavailable or VITE_USE_CHESSCOM_FIXTURE=true).
        </p>
      )}

      {lastResult && !isScanning && (
        <p className="text-sm text-emerald-400">
          Scan complete — {lastResult.blunders.length} new blunder(s),{' '}
          {lastResult.conversions.length} conversion(s) from {lastResult.gamesScanned}{' '}
          game(s).
        </p>
      )}

      {!settings.chesscom.username.trim() && (
        <p className="text-sm text-amber-200">
          Set your Chess.com username in Settings to enable scans.
        </p>
      )}

      {!engineReady && engineStatus !== 'error' && settings.chesscom.username.trim() && (
        <p className="text-sm text-amber-200">
          Waiting for Stockfish to finish loading before scanning.
        </p>
      )}
    </div>
  );
}
