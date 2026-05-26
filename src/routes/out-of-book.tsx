import { ModuleHeader } from '../components/layout/ModuleHeader';
import { useSearchParams } from 'react-router-dom';
import { TrainingBoard } from '../components/board/TrainingBoard';
import { DeviationList } from '../components/out-of-book/DeviationList';
import { PlanChoicePanel } from '../components/out-of-book/PlanChoicePanel';
import { PrinciplePanel } from '../components/out-of-book/PrinciplePanel';
import { useOutOfBookDrill } from '../hooks/useOutOfBookDrill';

export default function OutOfBookRoute() {
  const [params] = useSearchParams();
  const deviationId = params.get('deviation') ?? params.get('id');
  const parentNodeId = params.get('parent');

  const {
    deviations,
    selectedDeviation,
    selectedDeviationId,
    selectDeviation,
    step,
    feedback,
    selectedPlanId,
    choosePlan,
    progress,
    fen,
    draggableSquares,
    handleMove,
    orientation,
    isBoardLocked,
    hasContinuation,
  } = useOutOfBookDrill(deviationId, parentNodeId);

  return (
    <div>
      <ModuleHeader
        title="Out-of-Book Defender"
        description="Principled responses when opponents leave your prep."
      />
      <div className="grid gap-6 xl:grid-cols-[260px_minmax(0,1fr)_320px]">
        <aside className="space-y-6 rounded-lg border border-slate-800 bg-slate-900/30 p-4">
          <DeviationList
            deviations={deviations}
            selectedDeviationId={selectedDeviationId}
            onSelectDeviation={selectDeviation}
          />
        </aside>

        <section className="space-y-4">
          <div className="flex justify-center">
            <TrainingBoard
              fen={fen}
              orientation={orientation}
              onMove={handleMove}
              allowDragging={!isBoardLocked}
              draggableSquares={isBoardLocked ? undefined : draggableSquares}
              boardWidth={440}
            />
          </div>

          {selectedDeviation && (
            <PlanChoicePanel
              step={step}
              choices={selectedDeviation.planChoices}
              selectedPlanId={selectedPlanId}
              onChoose={choosePlan}
              feedback={feedback}
              hasContinuation={hasContinuation}
            />
          )}
        </section>

        <PrinciplePanel
          deviation={selectedDeviation}
          progress={progress}
          step={step}
          feedback={feedback}
          hasContinuation={hasContinuation}
        />
      </div>
    </div>
  );
}
