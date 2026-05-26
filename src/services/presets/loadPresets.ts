import presetsData from '../../../data/presets/structures-and-endgames.json';
import type { OpeningFamily, Preset, PresetModule, PresetsFile } from '../../types/preset';

export function loadPresetsFile(): PresetsFile {
  return presetsData as unknown as PresetsFile;
}

export function listPresets(): Preset[] {
  return loadPresetsFile().presets;
}

export function filterPresetsByModule(presets: Preset[], module: PresetModule): Preset[] {
  return presets.filter((preset) => preset.module === module);
}

export function filterPresetsByOpeningFamily(
  presets: Preset[],
  family: OpeningFamily | 'all',
): Preset[] {
  if (family === 'all') {
    return presets;
  }
  return presets.filter((preset) => preset.openingFamily === family);
}

export function getPresetById(presetId: string): Preset | undefined {
  return listPresets().find((preset) => preset.id === presetId);
}
