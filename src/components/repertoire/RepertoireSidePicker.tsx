import type { RepertoireColor, RepertoireRoot } from '../../types/repertoire';

interface RepertoireSidePickerProps {
  roots: RepertoireRoot[];
  selectedColor: RepertoireColor;
  onSelectColor: (color: RepertoireColor) => void;
}

export function RepertoireSidePicker({
  roots,
  selectedColor,
  onSelectColor,
}: RepertoireSidePickerProps) {
  return (
    <div className="space-y-2">
      <h2 className="text-sm font-medium text-slate-300">Side</h2>
      <div className="flex flex-col gap-2">
        {roots.map((root) => (
          <button
            key={root.id}
            type="button"
            onClick={() => onSelectColor(root.color)}
            className={`rounded-md border px-3 py-2 text-left text-sm transition-colors ${
              selectedColor === root.color
                ? 'border-emerald-600 bg-emerald-950/40 text-emerald-100'
                : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-600 hover:bg-slate-800'
            }`}
          >
            <span className="font-medium">
              {root.color === 'white' ? 'White' : 'Black'} — {root.opening}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
