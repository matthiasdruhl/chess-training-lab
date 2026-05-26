import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { EvalBar } from '../components/board/EvalBar';
import { TrainingBoard } from '../components/board/TrainingBoard';
import { ModuleHeader } from '../components/layout/ModuleHeader';
import { PlansPanel } from '../components/middlegame/PlansPanel';
import { PresetPicker } from '../components/middlegame/PresetPicker';
import { useAppContext } from '../context/AppContext';
import type { PresetFamilyFilter } from '../hooks/usePresetSession';
import { usePresetSession } from '../hooks/usePresetSession';

export default function MiddlegameRoute() {
  const [params] = useSearchParams();
  const presetFromQuery = params.get('preset');
  const { settings } = useAppContext();
  const [familyFilter, setFamilyFilter] = useState<PresetFamilyFilter>('all');

  const {
    presets,
    selectedPreset,
    selectedPresetId,
    selectPreset,
    fen,
    turn,
    history,
    stats,
    sessionMoveCount,
    sessionMessage,
    handleMove,
    endSession,
    orientation,
    isBoardLocked,
    isProcessing,
    lastEval,
  } = usePresetSession('middlegame', presetFromQuery, familyFilter);

  const showEvalBar = settings.ui.showEvalBar !== false;

  return (
    <div>
      <ModuleHeader
        title="Middlegame Simulator"
        description="Play from characteristic pawn structures vs the engine."
      />

      <div className="grid gap-6 xl:grid-cols-[260px_minmax(0,1fr)_320px]">
        <aside className="rounded-lg border border-slate-800 bg-slate-900/30 p-4">
          <PresetPicker
            presets={presets}
            selectedPresetId={selectedPresetId}
            familyFilter={familyFilter}
            onFamilyFilterChange={setFamilyFilter}
            onSelectPreset={selectPreset}
          />
        </aside>

        <section className="space-y-4">
          <div className="flex justify-center">
            <div className="flex items-start gap-3">
              {showEvalBar && (lastEval || isProcessing) && (
                <EvalBar
                  scoreCp={lastEval?.scoreCp ?? 0}
                  sideToMove={turn}
                  className="shrink-0"
                />
              )}
              <TrainingBoard
                fen={fen}
                orientation={orientation}
                onMove={handleMove}
                allowDragging={!isBoardLocked}
                boardWidth={440}
              />
            </div>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-slate-400">
                vs Stockfish
                {isProcessing && <span className="ml-2 text-emerald-400">thinking…</span>}
              </p>
              <button
                type="button"
                onClick={endSession}
                className="rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-slate-700"
              >
                Resign session
              </button>
            </div>
            <p className="mt-2 text-sm text-slate-400">
              {history.length > 0 ? history.join(' ') : 'Your move — free play, no reset on mistakes.'}
            </p>
            {sessionMessage && (
              <p className="mt-2 text-sm text-slate-300">{sessionMessage}</p>
            )}
          </div>
        </section>

        <PlansPanel preset={selectedPreset} stats={stats} sessionMoveCount={sessionMoveCount} />
      </div>
    </div>
  );
}
