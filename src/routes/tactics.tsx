import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { TrainingBoard } from '../components/board/TrainingBoard';
import { ModuleHeader } from '../components/layout/ModuleHeader';
import { PackList } from '../components/tactics/PackList';
import { PuzzleInfoPanel } from '../components/tactics/PuzzleInfoPanel';
import { useStructureTactics } from '../hooks/useStructureTactics';

export default function TacticsRoute() {
  const [params] = useSearchParams();
  const packFromQuery = params.get('pack');

  const {
    packs,
    selectedPack,
    selectedPackId,
    selectPack,
    currentPuzzle,
    currentProgress,
    queueIndex,
    queueLength,
    solvedCount,
    fen,
    step,
    feedback,
    engineHint,
    isLoadingHint,
    handleMove,
    revealSolution,
    nextPuzzle,
    requestEngineHint,
    orientation,
    isBoardLocked,
    allowSolutionReveal,
  } = useStructureTactics(packFromQuery);

  const progressByPack = useMemo(() => {
    const map = new Map<string, { solved: number; total: number }>();
    for (const pack of packs) {
      map.set(pack.id, {
        solved: pack.id === selectedPackId ? solvedCount : 0,
        total: pack.puzzleIds.length,
      });
    }
    return map;
  }, [packs, selectedPackId, solvedCount]);

  return (
    <div>
      <ModuleHeader
        title="Structure Tactics"
        description="Pattern recognition in your opening structures."
      />

      <div className="grid gap-6 xl:grid-cols-[260px_minmax(0,1fr)_320px]">
        <aside className="rounded-lg border border-slate-800 bg-slate-900/30 p-4">
          <PackList
            packs={packs}
            selectedPackId={selectedPackId}
            progressByPack={progressByPack}
            onSelectPack={selectPack}
          />
          {selectedPack && (
            <p className="mt-4 text-xs text-slate-500">
              Puzzle {queueIndex + 1} of {queueLength} in current queue
            </p>
          )}
        </aside>

        <section className="space-y-4">
          <div className="flex justify-center">
            <TrainingBoard
              fen={fen}
              orientation={orientation}
              onMove={handleMove}
              allowDragging={!isBoardLocked}
              boardWidth={440}
            />
          </div>

          {step === 'correct' && (
            <p className="text-center text-sm font-medium text-emerald-400">Correct!</p>
          )}
        </section>

        <PuzzleInfoPanel
          puzzle={currentPuzzle}
          progress={currentProgress}
          queueIndex={queueIndex}
          queueLength={queueLength}
          solvedCount={solvedCount}
          step={step}
          feedback={feedback}
          engineHint={engineHint}
          isLoadingHint={isLoadingHint}
          allowSolutionReveal={allowSolutionReveal}
          onRevealSolution={revealSolution}
          onRequestHint={() => void requestEngineHint()}
          onNextPuzzle={nextPuzzle}
        />
      </div>
    </div>
  );
}
