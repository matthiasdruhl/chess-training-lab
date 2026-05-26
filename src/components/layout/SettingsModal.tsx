import { useState } from 'react';
import type { AppSettings } from '../../types/settings';
import type { SettingsPatch } from '../../utils/settingsMerge';
import {
  BLUNDER_SWING_CP,
  CONVERSION_DROP_TO_CP,
  CONVERSION_MIN_PEAK_CP,
  LEAK_MIN_SWING_CP,
} from '../../constants/analysis';
import { CHESSCOM_DEFAULT_MONTHS } from '../../constants/chesscom';
import { QUIZ_DEPTH, SCAN_MOVETIME_MS } from '../../constants/engine';

interface SettingsModalProps {
  isOpen: boolean;
  settings: AppSettings;
  isLoading?: boolean;
  onClose: () => void;
  onSave: (patch: SettingsPatch) => Promise<void>;
}

export function SettingsModal({
  isOpen,
  settings,
  isLoading = false,
  onClose,
  onSave,
}: SettingsModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <SettingsModalBody
      key={settings.updatedAt}
      settings={settings}
      isLoading={isLoading}
      onClose={onClose}
      onSave={onSave}
    />
  );
}

function SettingsModalBody({
  settings,
  isLoading,
  onClose,
  onSave,
}: Omit<SettingsModalProps, 'isOpen'>) {
  const [username, setUsername] = useState(settings.chesscom.username);
  const [months, setMonths] = useState(settings.chesscom.defaultMonthsToFetch);
  const [minSwing, setMinSwing] = useState(settings.leakDetector.minSwingCp);
  const [blunderSwing, setBlunderSwing] = useState(
    settings.leakDetector.blunderSwingCp,
  );
  const [scanMovetime, setScanMovetime] = useState(
    settings.leakDetector.scanMovetimeMs,
  );
  const [quizDepth, setQuizDepth] = useState(settings.leakDetector.quizDepth);
  const [minPeak, setMinPeak] = useState(settings.conversionReview.minPeakCp);
  const [dropTo, setDropTo] = useState(settings.conversionReview.dropToCp);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await onSave({
        chesscom: {
          ...settings.chesscom,
          username: username.trim(),
          defaultMonthsToFetch: months,
        },
        leakDetector: {
          ...settings.leakDetector,
          minSwingCp: minSwing,
          blunderSwingCp: blunderSwing,
          scanMovetimeMs: scanMovetime,
          quizDepth,
        },
        conversionReview: {
          ...settings.conversionReview,
          minPeakCp: minPeak,
          dropToCp: dropTo,
          scanMovetimeMs: scanMovetime,
        },
      });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border border-slate-700 bg-slate-900 p-6 shadow-xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id="settings-title" className="text-lg font-semibold text-white">
            Settings
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-slate-400 hover:bg-slate-800 hover:text-white"
            aria-label="Close settings"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <fieldset className="space-y-3">
            <legend className="text-sm font-medium text-slate-200">Chess.com</legend>
            <div>
              <label htmlFor="chesscom-username" className="mb-1 block text-sm text-slate-300">
                Username
              </label>
              <input
                id="chesscom-username"
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="your-username"
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label htmlFor="months-fetch" className="mb-1 block text-sm text-slate-300">
                Months to fetch (default {CHESSCOM_DEFAULT_MONTHS})
              </label>
              <input
                id="months-fetch"
                type="number"
                min={1}
                max={12}
                value={months}
                onChange={(event) => setMonths(Number(event.target.value))}
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              />
            </div>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="text-sm font-medium text-slate-200">Leak detector</legend>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="min-swing" className="mb-1 block text-xs text-slate-400">
                  Min swing cp (default {LEAK_MIN_SWING_CP})
                </label>
                <input
                  id="min-swing"
                  type="number"
                  value={minSwing}
                  onChange={(event) => setMinSwing(Number(event.target.value))}
                  className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label htmlFor="blunder-swing" className="mb-1 block text-xs text-slate-400">
                  Blunder swing cp (default {BLUNDER_SWING_CP})
                </label>
                <input
                  id="blunder-swing"
                  type="number"
                  value={blunderSwing}
                  onChange={(event) => setBlunderSwing(Number(event.target.value))}
                  className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="scan-movetime" className="mb-1 block text-xs text-slate-400">
                  Scan movetime ms (default {SCAN_MOVETIME_MS})
                </label>
                <input
                  id="scan-movetime"
                  type="number"
                  value={scanMovetime}
                  onChange={(event) => setScanMovetime(Number(event.target.value))}
                  className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label htmlFor="quiz-depth" className="mb-1 block text-xs text-slate-400">
                  Quiz depth (default {QUIZ_DEPTH})
                </label>
                <input
                  id="quiz-depth"
                  type="number"
                  value={quizDepth}
                  onChange={(event) => setQuizDepth(Number(event.target.value))}
                  className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                />
              </div>
            </div>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="text-sm font-medium text-slate-200">Conversion review</legend>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="min-peak" className="mb-1 block text-xs text-slate-400">
                  Min peak cp (default {CONVERSION_MIN_PEAK_CP})
                </label>
                <input
                  id="min-peak"
                  type="number"
                  value={minPeak}
                  onChange={(event) => setMinPeak(Number(event.target.value))}
                  className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label htmlFor="drop-to" className="mb-1 block text-xs text-slate-400">
                  Drop to cp (default {CONVERSION_DROP_TO_CP})
                </label>
                <input
                  id="drop-to"
                  type="number"
                  value={dropTo}
                  onChange={(event) => setDropTo(Number(event.target.value))}
                  className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                />
              </div>
            </div>
          </fieldset>

          <p className="text-xs text-slate-500">
            Export and import full training data from the Dashboard backup section.
          </p>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || isLoading}
              className="rounded-md bg-slate-100 px-4 py-2 text-sm font-medium text-slate-900 hover:bg-white disabled:opacity-50"
            >
              {isLoading ? 'Loading…' : saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
