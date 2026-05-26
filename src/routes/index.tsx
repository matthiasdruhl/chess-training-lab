import { Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import type { Square } from 'chess.js';
import { EvalBar } from '../components/board/EvalBar';
import { TrainingBoard } from '../components/board/TrainingBoard';
import { SettingsModal } from '../components/layout/SettingsModal';
import { MODULES } from '../constants/modules';
import { useAppContext } from '../context/AppContext';
import { useChessSession } from '../hooks/useChessSession';
import { useStockfish } from '../hooks/useStockfish';
import { loadRepertoire } from '../services/repertoire/loadRepertoire';
import { flattenTrainableNodes } from '../services/repertoire/treeUtils';
import { getProgress, isProgressDue } from '../storage/progressRepo';

export default function DashboardRoute() {
  const { settings, isLoading, updateUsername } = useAppContext();
  const { fen, turn, history, loadFen, makeMove, applyUciMove } = useChessSession();
  const {
    engineStatus,
    lastEval,
    engineError,
    analyze,
    bestMove,
    restartEngine,
    isThinking,
  } = useStockfish();
  const [fenInput, setFenInput] = useState('');
  const [fenError, setFenError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [linesDueCount, setLinesDueCount] = useState<number | null>(null);

  const trainableNodes = useMemo(() => {
    const repertoire = loadRepertoire();
    return repertoire.roots.flatMap((root) => flattenTrainableNodes(root));
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadDueCount() {
      const dueFlags = await Promise.all(
        trainableNodes.map(async ({ node }) => {
          const progress = await getProgress(node.id);
          return isProgressDue(progress);
        }),
      );
      if (!cancelled) {
        setLinesDueCount(dueFlags.filter(Boolean).length);
      }
    }

    void loadDueCount();
    return () => {
      cancelled = true;
    };
  }, [trainableNodes]);

  const showEvalBar = lastEval !== null || isThinking;

  function handleLoadFen() {
    const trimmed = fenInput.trim();
    if (!trimmed) {
      setFenError('Enter a FEN string.');
      return;
    }
    const ok = loadFen(trimmed);
    if (!ok) {
      setFenError('Invalid FEN — could not load position.');
      return;
    }
    setFenError(null);
  }

  function handleMove(from: Square, to: Square, promotion?: 'q' | 'r' | 'b' | 'n') {
    return makeMove(from, to, promotion);
  }

  async function handleAnalyze() {
    setActionError(null);
    try {
      await analyze(fen);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Analysis failed.');
    }
  }

  async function handleEngineMove() {
    setActionError(null);
    try {
      const uci = await bestMove(fen);
      const applied = applyUciMove(uci);
      if (!applied) {
        setActionError(`Engine suggested illegal move: ${uci}`);
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Engine move failed.');
    }
  }

  const engineBusy =
    isThinking || engineStatus === 'idle' || engineStatus === 'error';

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Chess Training Lab</h1>
          <p className="mt-1 text-sm text-slate-400">
            Personal training hub — all eight modules in one place.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          className="flex items-center gap-2 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800"
          aria-label="Open settings"
        >
          <span aria-hidden="true">⚙</span>
          Settings
        </button>
      </div>

      {!isLoading && !settings.chesscom.username && (
        <p className="rounded-md border border-amber-800/50 bg-amber-950/30 px-4 py-3 text-sm text-amber-200">
          Set your Chess.com username in settings to enable game scans (Phase 7).
        </p>
      )}

      <section className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-medium text-white">Lines due for review</h2>
            <p className="mt-1 text-sm text-slate-400">
              Repertoire lines not practiced recently or still in learning.
            </p>
          </div>
          <Link
            to="/repertoire"
            className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600"
          >
            Open repertoire
          </Link>
        </div>
        <p className="mt-4 text-3xl font-semibold text-white">
          {linesDueCount === null ? '…' : linesDueCount}
        </p>
        <p className="mt-1 text-sm text-slate-500">
          {linesDueCount === 1 ? 'line due' : 'lines due'}
        </p>
      </section>

      <section className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
        <h2 className="mb-4 text-lg font-medium text-white">Board preview</h2>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="flex items-start gap-3">
            {showEvalBar && (
              <EvalBar
                scoreCp={lastEval?.scoreCp ?? 0}
                sideToMove={turn}
                className="shrink-0"
              />
            )}
            <TrainingBoard fen={fen} onMove={handleMove} />
          </div>
          <div className="flex-1 space-y-4">
            <div>
              <label htmlFor="fen-input" className="mb-1 block text-sm text-slate-300">
                Load FEN
              </label>
              <div className="flex flex-wrap gap-2">
                <input
                  id="fen-input"
                  type="text"
                  value={fenInput}
                  onChange={(event) => setFenInput(event.target.value)}
                  placeholder="Paste FEN here…"
                  className="min-w-0 flex-1 rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-slate-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleLoadFen}
                  className="rounded-md bg-slate-100 px-4 py-2 text-sm font-medium text-slate-900 hover:bg-white"
                >
                  Load
                </button>
              </div>
              {fenError && (
                <p className="mt-1 text-sm text-red-400">{fenError}</p>
              )}
            </div>

            <div className="rounded-md border border-slate-800 bg-slate-950/60 p-4">
              <h3 className="mb-3 text-sm font-medium text-slate-200">Engine smoke test</h3>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void handleAnalyze()}
                  disabled={engineBusy}
                  className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Analyze
                </button>
                <button
                  type="button"
                  onClick={() => void handleEngineMove()}
                  disabled={engineBusy}
                  className="rounded-md bg-indigo-700 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Engine move
                </button>
                {engineStatus === 'error' && (
                  <button
                    type="button"
                    onClick={restartEngine}
                    className="rounded-md border border-red-700 px-4 py-2 text-sm font-medium text-red-300 hover:bg-red-950/50"
                  >
                    Restart engine
                  </button>
                )}
              </div>
              {engineError && engineStatus === 'error' && (
                <p className="mt-2 text-sm text-red-400">{engineError}</p>
              )}
              {lastEval && (
                <p className="mt-3 text-sm text-slate-400">
                  Depth {lastEval.depth} · best {lastEval.bestMoveUci}
                  {lastEval.pv.length > 0 && (
                    <> · PV {lastEval.pv.slice(0, 4).join(' ')}</>
                  )}
                </p>
              )}
              {actionError && (
                <p className="mt-2 text-sm text-red-400">{actionError}</p>
              )}
            </div>

            <div>
              <h3 className="mb-1 text-sm font-medium text-slate-300">Move history</h3>
              <p className="text-sm text-slate-400">
                {history.length > 0 ? history.join(' ') : 'No moves yet — drag pieces on the board.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-medium text-white">Training modules</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {MODULES.map((mod) => (
            <article
              key={mod.path}
              className="flex flex-col rounded-lg border border-slate-800 bg-slate-900/50 p-4"
            >
              <h3 className="font-medium text-white">{mod.title}</h3>
              <p className="mt-1 flex-1 text-sm text-slate-400">{mod.description}</p>
              <Link
                to={mod.path}
                className="mt-4 inline-block w-fit rounded-md bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-900 hover:bg-white"
              >
                Open
              </Link>
            </article>
          ))}
        </div>
      </section>

      <SettingsModal
        isOpen={settingsOpen}
        username={settings.chesscom.username}
        isLoading={isLoading}
        onClose={() => setSettingsOpen(false)}
        onSave={updateUsername}
      />
    </div>
  );
}
