export type PresetModule = 'middlegame' | 'endgame';

export type OpeningFamily = 'queens-gambit' | 'caro-kann' | null;

export interface PresetsFile {
  meta: { version: string; name: string; updatedAt: string };
  presets: Preset[];
}

export interface Preset {
  id: string;
  module: PresetModule;
  name: string;
  fen: string;
  sideToTrain: 'white' | 'black';
  openingFamily: OpeningFamily;
  structureTag?: string;
  endgameTheme?: string;
  plans: string[];
  objective: string;
  stockfish: {
    role: 'opponent' | 'defender';
    skillLevel: number;
    movetimeMs: number;
    depth: number | null;
  };
  sessionDefaults: {
    resetOnMistake: boolean;
    resetOnDraw?: boolean;
    maxMoves?: number;
  };
  tags: string[];
}

export interface DrillStats {
  version: 1;
  presetId: string;
  module: PresetModule;
  attempts: number;
  completions: number;
  resetCount: number;
  totalMoves: number;
  lastPlayedAt: string | null;
  bestSessionMoves?: number;
  notes: string;
}
