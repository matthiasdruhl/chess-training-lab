import type { BridgeHandoff } from '../../types/bridge';

interface RecapPanelProps {
  handoff: BridgeHandoff | undefined;
}

export function RecapPanel({ handoff }: RecapPanelProps) {
  if (!handoff) {
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
        <h2 className="text-sm font-medium text-slate-300">Recap</h2>
        <p className="mt-2 text-sm text-slate-500">Select a handoff to begin.</p>
      </div>
    );
  }

  const recapMoves = handoff.recapSan.slice(Math.max(0, handoff.recapSan.length - handoff.recapMoveCount));

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
      <h2 className="text-sm font-medium text-slate-300">Recap</h2>
      <p className="mt-2 text-sm text-slate-400">
        Last {handoff.recapMoveCount} plies: <span className="text-slate-200">{recapMoves.join(' ')}</span>
      </p>
    </div>
  );
}

