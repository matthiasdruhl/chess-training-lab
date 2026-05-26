interface DrillHUDProps {
  sessionMoveCount: number;
  sessionResetCount: number;
  isProcessing: boolean;
  sessionMessage: string | null;
  onEndSession: () => void;
}

export function DrillHUD({
  sessionMoveCount,
  sessionResetCount,
  isProcessing,
  sessionMessage,
  onEndSession,
}: DrillHUDProps) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-4 text-sm">
          <span className="text-slate-400">
            Moves: <span className="font-medium text-white">{sessionMoveCount}</span>
          </span>
          <span className="text-slate-400">
            Resets: <span className="font-medium text-amber-300">{sessionResetCount}</span>
          </span>
          {isProcessing && (
            <span className="text-emerald-400">Engine thinking…</span>
          )}
        </div>
        <button
          type="button"
          onClick={onEndSession}
          className="rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-slate-700"
        >
          Done
        </button>
      </div>
      {sessionMessage && (
        <p className="mt-2 text-sm text-slate-300">{sessionMessage}</p>
      )}
    </div>
  );
}
