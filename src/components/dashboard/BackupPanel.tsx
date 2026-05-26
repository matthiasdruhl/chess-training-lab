import { useRef, useState } from 'react';
import type { AppBackup } from '../../types/backup';
import {
  BackupValidationError,
  downloadBackupFile,
  exportBackup,
  getBackupRecordCounts,
  importBackup,
  parseBackupJson,
} from '../../storage/backup';

interface BackupPanelProps {
  onToast: (message: string, variant?: 'success' | 'error') => void;
  onImportComplete?: () => void;
}

function formatValidationError(err: unknown): string {
  if (err instanceof BackupValidationError) {
    return err.errors.join(' ');
  }
  if (err instanceof Error) {
    return err.message;
  }
  return 'Import failed.';
}

export function BackupPanel({ onToast, onImportComplete }: BackupPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [pendingBackup, setPendingBackup] = useState<AppBackup | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  async function handleExport() {
    setIsExporting(true);
    try {
      const backup = await exportBackup();
      downloadBackupFile(backup);
      onToast('Backup downloaded.');
    } catch (err) {
      onToast(
        err instanceof Error ? err.message : 'Export failed.',
        'error',
      );
    } finally {
      setIsExporting(false);
    }
  }

  async function handleFileSelected(file: File) {
    setParseError(null);
    setPendingBackup(null);

    try {
      const text = await file.text();
      const backup = parseBackupJson(text);
      setPendingBackup(backup);
    } catch (err) {
      setParseError(formatValidationError(err));
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  function handleCancelImport() {
    setPendingBackup(null);
    setParseError(null);
  }

  async function handleConfirmImport() {
    if (!pendingBackup) {
      return;
    }

    setIsImporting(true);
    try {
      await importBackup(pendingBackup);
      onToast('Backup imported — reloading…');
      onImportComplete?.();
      window.setTimeout(() => window.location.reload(), 400);
    } catch (err) {
      onToast(formatValidationError(err), 'error');
    } finally {
      setIsImporting(false);
      setPendingBackup(null);
    }
  }

  const recordCounts = pendingBackup ? getBackupRecordCounts(pendingBackup) : null;

  return (
    <section className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
      <h2 className="text-lg font-medium text-white">Backup</h2>
      <p className="mt-1 text-sm text-slate-400">
        Export or restore all nine IndexedDB stores (settings, progress, scans).
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void handleExport()}
          disabled={isExporting || isImporting}
          className="rounded-md bg-slate-100 px-4 py-2 text-sm font-medium text-slate-900 hover:bg-white disabled:opacity-50"
        >
          {isExporting ? 'Exporting…' : 'Export all data'}
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isExporting || isImporting}
          className="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-50"
        >
          {isImporting ? 'Importing…' : 'Import backup'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              void handleFileSelected(file);
            }
          }}
        />
      </div>

      {parseError && (
        <p className="mt-3 text-sm text-red-400" role="alert">
          {parseError}
        </p>
      )}

      {pendingBackup && recordCounts && (
        <div className="mt-4 rounded-md border border-amber-800/50 bg-amber-950/20 p-4">
          <p className="text-sm font-medium text-amber-100">
            Replace all local training data?
          </p>
          <p className="mt-1 text-sm text-amber-200/80">
            This will overwrite settings, progress, and scan results with the backup file.
          </p>
          <dl className="mt-3 grid gap-1 text-sm text-slate-300 sm:grid-cols-2">
            <div>
              <dt className="text-slate-500">Exported</dt>
              <dd>{new Date(pendingBackup.meta.exportedAt).toLocaleString()}</dd>
            </div>
            <div>
              <dt className="text-slate-500">App version</dt>
              <dd>{pendingBackup.meta.appVersion}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Repertoire lines</dt>
              <dd>{recordCounts.repertoire_progress}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Out-of-book</dt>
              <dd>{recordCounts.out_of_book_progress}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Bridge handoffs</dt>
              <dd>{recordCounts.bridge_progress}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Drill stats</dt>
              <dd>{recordCounts.drill_stats}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Tactics progress</dt>
              <dd>{recordCounts.tactics_progress}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Blunders</dt>
              <dd>{recordCounts.personal_blunders}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Conversions</dt>
              <dd>{recordCounts.conversion_missed}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Analysis cache</dt>
              <dd>{recordCounts.analysis_cache}</dd>
            </div>
          </dl>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void handleConfirmImport()}
              disabled={isImporting}
              className="rounded-md bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50"
            >
              {isImporting ? 'Importing…' : 'Confirm import'}
            </button>
            <button
              type="button"
              onClick={handleCancelImport}
              disabled={isImporting}
              className="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
