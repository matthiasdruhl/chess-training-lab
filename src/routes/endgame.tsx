import { useSearchParams } from 'react-router-dom';
import { EvalBar } from '../components/board/EvalBar';
import { TrainingBoard } from '../components/board/TrainingBoard';
import { DrillHUD } from '../components/endgame/DrillHUD';
import { ResetToast } from '../components/endgame/ResetToast';
import { ModuleHeader } from '../components/layout/ModuleHeader';
import { PlansPanel } from '../components/middlegame/PlansPanel';
import { PresetPicker } from '../components/middlegame/PresetPicker';
import { useAppContext } from '../context/AppContext';
import { usePresetSession } from '../hooks/usePresetSession';

function EndgameSession({ presetFromQuery }: { presetFromQuery: string | null }) {
  const { settings } = useAppContext();

  const {
    presets,
    selectedPreset,
    selectedPresetId,
    selectPreset,
    fen,
    draggableSquares,
    turn,
    stats,
    sessionMoveCount,
    sessionResetCount,
    showResetToast,
    sessionMessage,
    handleMove,
    endSession,
    orientation,
    isBoardLocked,
    isProcessing,
    lastEval,
  } = usePresetSession('endgame', presetFromQuery, 'all');

  const showEvalBar = settings.ui.showEvalBar !== false;

  return (
    <div>
      <ModuleHeader
        title="Endgame Drill-Master"
        description="High-repetition endgame technique with strict reset on imprecision."
      />

      <ResetToast visible={showResetToast} resetCount={sessionResetCount} />

      <div className="grid gap-6 xl:grid-cols-[260px_minmax(0,1fr)_320px]">
        <aside className="rounded-lg border border-slate-800 bg-slate-900/30 p-4">
          <PresetPicker
            presets={presets}
            selectedPresetId={selectedPresetId}
            familyFilter="all"
            onFamilyFilterChange={() => {}}
            onSelectPreset={selectPreset}
            showFamilyFilter={false}
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
                draggableSquares={isBoardLocked ? undefined : draggableSquares}
                boardWidth={440}
              />
            </div>
          </div>

          <DrillHUD
            sessionMoveCount={sessionMoveCount}
            sessionResetCount={sessionResetCount}
            isProcessing={isProcessing}
            sessionMessage={sessionMessage}
            onEndSession={endSession}
          />
        </section>

        <PlansPanel
          preset={selectedPreset}
          stats={stats}
          sessionMoveCount={sessionMoveCount}
          variant="endgame"
        />
      </div>
    </div>
  );
}

export default function EndgameRoute() {
  const [params] = useSearchParams();
  const presetFromQuery = params.get('preset');
  return <EndgameSession key={presetFromQuery ?? 'none'} presetFromQuery={presetFromQuery} />;
}
