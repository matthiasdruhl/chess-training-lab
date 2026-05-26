import { ModuleHeader } from '../components/layout/ModuleHeader';
import { TrainingBoard } from '../components/board/TrainingBoard';
import { LineIntentPanel } from '../components/repertoire/LineIntentPanel';
import { RepertoireSidePicker } from '../components/repertoire/RepertoireSidePicker';
import { RepertoireTree } from '../components/repertoire/RepertoireTree';
import { TrainerControls } from '../components/repertoire/TrainerControls';
import { useRepertoireTrainer } from '../hooks/useRepertoireTrainer';
import { listDeviations } from '../services/out-of-book/loadDeviations';
import { listHandoffs } from '../services/bridge/loadHandoffs';
import { useMemo } from 'react';

export default function RepertoireRoute() {
  const {
    repertoire,
    selectedColor,
    changeColor,
    selectedNodeId,
    selectedNode,
    treeNodes,
    progressMap,
    fen,
    phase,
    showIntent,
    feedback,
    isAutoPlaying,
    isBoardLocked,
    displayedMoves,
    currentProgress,
    selectNode,
    resetLine,
    handleMove,
    markKnown,
    showHint,
  } = useRepertoireTrainer();

  const boardOrientation = selectedColor;

  const deviationCountsByNodeId = useMemo(() => {
    const map: Record<string, number> = {};
    for (const deviation of listDeviations()) {
      map[deviation.parentNodeId] = (map[deviation.parentNodeId] ?? 0) + 1;
    }
    return map;
  }, []);

  const bridgeHandoffIdByNodeId = useMemo(() => {
    const map: Record<string, string> = {};
    for (const handoff of listHandoffs()) {
      if (!map[handoff.repertoireNodeId]) {
        map[handoff.repertoireNodeId] = handoff.id;
      }
    }
    return map;
  }, []);

  return (
    <div>
      <ModuleHeader
        title="Repertoire Trainer"
        description="Memorize opening lines with intent and move order."
      />

      <div className="grid gap-6 xl:grid-cols-[220px_minmax(0,1fr)_280px]">
        <aside className="space-y-6 rounded-lg border border-slate-800 bg-slate-900/30 p-4">
          <RepertoireSidePicker
            roots={repertoire.roots}
            selectedColor={selectedColor}
            onSelectColor={changeColor}
          />
          <RepertoireTree
            nodes={treeNodes}
            selectedNodeId={selectedNodeId}
            progressMap={progressMap}
            onSelectNode={selectNode}
            deviationCountsByNodeId={deviationCountsByNodeId}
            bridgeHandoffIdByNodeId={bridgeHandoffIdByNodeId}
          />
        </aside>

        <section className="space-y-4">
          <div className="flex justify-center">
            <TrainingBoard
              fen={fen}
              orientation={boardOrientation}
              onMove={handleMove}
              allowDragging={!isBoardLocked}
              boardWidth={440}
            />
          </div>
          {phase === 'complete' && (
            <p className="text-center text-sm font-medium text-emerald-400">
              Line complete — streak updated.
            </p>
          )}
          <TrainerControls
            node={selectedNode}
            moves={displayedMoves}
            isAutoPlaying={isAutoPlaying}
            isBoardLocked={isBoardLocked}
            onReset={resetLine}
            onHint={showHint}
          />
        </section>

        <LineIntentPanel
          node={selectedNode}
          progress={currentProgress}
          showIntent={showIntent}
          feedback={feedback}
          onMarkKnown={markKnown}
        />
      </div>
    </div>
  );
}
