interface ResetToastProps {
  visible: boolean;
  resetCount: number;
}

export function ResetToast({ visible, resetCount }: ResetToastProps) {
  if (!visible) {
    return null;
  }

  return (
    <div
      role="status"
      className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-amber-700/50 bg-amber-950/95 px-4 py-3 shadow-lg"
    >
      <p className="text-sm font-medium text-amber-100">
        Reset — find the precise move
      </p>
      <p className="mt-0.5 text-xs text-amber-200/80">
        Session resets: {resetCount}
      </p>
    </div>
  );
}
