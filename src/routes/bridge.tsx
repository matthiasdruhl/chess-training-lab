import { ModuleHeader } from '../components/layout/ModuleHeader';
import { useSearchParams } from 'react-router-dom';
import { TrainingBoard } from '../components/board/TrainingBoard';
import { HandoffList } from '../components/bridge/HandoffList';
import { RecapPanel } from '../components/bridge/RecapPanel';
import { BridgePlanQuiz } from '../components/bridge/BridgePlanQuiz';
import { useBridgeHandoff } from '../hooks/useBridgeHandoff';

export default function BridgeRoute() {
  const [params] = useSearchParams();
  const handoffId = params.get('handoff') ?? params.get('id');
  const nodeId = params.get('node');

  const {
    handoffs,
    selectedHandoff,
    selectedHandoffId,
    selectHandoff,
    fen,
    passed,
    feedback,
    selectedPlanId,
    choosePlan,
    continueToMiddlegame,
    orientation,
  } = useBridgeHandoff(handoffId, nodeId);

  return (
    <div>
      <ModuleHeader
        title="Opening → Middlegame Bridge"
        description="Connect theory to middlegame plans after the opening."
      />
      <div className="grid gap-6 xl:grid-cols-[260px_minmax(0,1fr)_320px]">
        <aside className="space-y-6 rounded-lg border border-slate-800 bg-slate-900/30 p-4">
          <HandoffList
            handoffs={handoffs}
            selectedHandoffId={selectedHandoffId}
            onSelectHandoff={selectHandoff}
          />
        </aside>

        <section className="space-y-4">
          <div className="flex justify-center">
            <TrainingBoard fen={fen} orientation={orientation} allowDragging={false} boardWidth={440} />
          </div>
          <BridgePlanQuiz
            handoff={selectedHandoff}
            passed={passed}
            selectedPlanId={selectedPlanId}
            feedback={feedback}
            onChoosePlan={choosePlan}
            onContinue={continueToMiddlegame}
          />
        </section>

        <RecapPanel handoff={selectedHandoff} />
      </div>
    </div>
  );
}
