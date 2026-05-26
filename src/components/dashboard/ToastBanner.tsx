import { TOAST_DURATION_MS } from '../../constants/training';
import { useEffect } from 'react';

interface ToastBannerProps {
  message: string | null;
  variant?: 'success' | 'error';
  onDismiss: () => void;
}

export function ToastBanner({
  message,
  variant = 'success',
  onDismiss,
}: ToastBannerProps) {
  useEffect(() => {
    if (!message) {
      return;
    }
    const timer = setTimeout(onDismiss, TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [message, onDismiss]);

  if (!message) {
    return null;
  }

  const styles =
    variant === 'error'
      ? 'border-red-800/60 bg-red-950/50 text-red-200'
      : 'border-emerald-800/60 bg-emerald-950/40 text-emerald-200';

  return (
    <p
      role="status"
      className={`rounded-md border px-4 py-3 text-sm ${styles}`}
    >
      {message}
    </p>
  );
}
