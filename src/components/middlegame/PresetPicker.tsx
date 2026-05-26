import type { Preset } from '../../types/preset';
import type { PresetFamilyFilter } from '../../hooks/usePresetSession';

interface PresetPickerProps {
  presets: Preset[];
  selectedPresetId: string | null;
  familyFilter: PresetFamilyFilter;
  onFamilyFilterChange: (filter: PresetFamilyFilter) => void;
  onSelectPreset: (id: string) => void;
  showFamilyFilter?: boolean;
}

const FAMILY_OPTIONS: { value: PresetFamilyFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'queens-gambit', label: "Queen's Gambit" },
  { value: 'caro-kann', label: 'Caro-Kann' },
];

export function PresetPicker({
  presets,
  selectedPresetId,
  familyFilter,
  onFamilyFilterChange,
  onSelectPreset,
  showFamilyFilter = true,
}: PresetPickerProps) {
  return (
    <div className="space-y-4">
      {showFamilyFilter && (
        <div>
          <h2 className="mb-2 text-sm font-medium text-slate-300">Filter</h2>
          <div className="flex flex-wrap gap-1">
            {FAMILY_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onFamilyFilterChange(option.value)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  familyFilter === option.value
                    ? 'bg-emerald-700 text-white'
                    : 'border border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <h2 className="text-sm font-medium text-slate-300">Presets</h2>
        {presets.length === 0 ? (
          <p className="text-sm text-slate-500">No presets match this filter.</p>
        ) : (
          <ul className="space-y-1">
            {presets.map((preset) => (
              <li key={preset.id}>
                <button
                  type="button"
                  onClick={() => onSelectPreset(preset.id)}
                  aria-pressed={selectedPresetId === preset.id}
                  className={`w-full rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                    selectedPresetId === preset.id
                      ? 'border-emerald-600 bg-emerald-950/30 text-white'
                      : 'border-slate-800 bg-slate-900/60 text-slate-200 hover:border-slate-600 hover:bg-slate-800/80'
                  }`}
                >
                  <span className="block truncate font-medium">{preset.name}</span>
                  {preset.structureTag && (
                    <span className="mt-1 block text-xs text-slate-400">{preset.structureTag}</span>
                  )}
                  {preset.endgameTheme && (
                    <span className="mt-1 block text-xs text-slate-400">{preset.endgameTheme}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
