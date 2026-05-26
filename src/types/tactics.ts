export type OpeningFamily = 'queens-gambit' | 'caro-kann';

export type TacticsProgressStatus = 'new' | 'learning' | 'review' | 'mastered';

export interface StructureTacticsFileMeta {
  version: string;
  name: string;
  updatedAt: string;
}

export interface TacticsPack {
  id: string;
  name: string;
  description: string;
  structureTag: string;
  openingFamily: OpeningFamily;
  puzzleIds: string[];
}

export interface StructurePuzzle {
  id: string;
  packId: string;
  name: string;
  fen: string;
  sideToMove: 'white' | 'black';
  solutionUci: string;
  solutionAliasesUci?: string[];
  solutionSan: string;
  theme: string;
  structureTag: string;
  difficulty: 1 | 2 | 3;
  themeHint: string;
  relatedPresetId?: string;
  tags: string[];
}

export interface StructureTacticsFile {
  meta: StructureTacticsFileMeta;
  packs: TacticsPack[];
  puzzles: StructurePuzzle[];
}

export interface TacticsProgress {
  version: 1;
  puzzleId: string;
  packId: string;
  status: TacticsProgressStatus;
  attempts: number;
  solves: number;
  revealedSolution: boolean;
  lastAttemptAt: string | null;
  masteredAt: string | null;
}
