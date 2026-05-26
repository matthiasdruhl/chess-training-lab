import tacticsData from '../../../data/tactics/structure-tactics.json';
import type {
  StructurePuzzle,
  StructureTacticsFile,
  TacticsPack,
} from '../../types/tactics';

export function loadStructureTacticsFile(): StructureTacticsFile {
  return tacticsData as unknown as StructureTacticsFile;
}

let cachedFile: StructureTacticsFile | null = null;

export function getStructureTacticsFile(): StructureTacticsFile {
  if (!cachedFile) {
    cachedFile = loadStructureTacticsFile();
  }
  return cachedFile;
}

export function listTacticsPacks(): TacticsPack[] {
  return getStructureTacticsFile().packs;
}

export function listStructurePuzzles(): StructurePuzzle[] {
  return getStructureTacticsFile().puzzles;
}

export function getTacticsPackById(packId: string): TacticsPack | undefined {
  return getStructureTacticsFile().packs.find((pack) => pack.id === packId);
}

export function getStructurePuzzleById(puzzleId: string): StructurePuzzle | undefined {
  return getStructureTacticsFile().puzzles.find((puzzle) => puzzle.id === puzzleId);
}

export function getPuzzlesForPack(packId: string): StructurePuzzle[] {
  const pack = getTacticsPackById(packId);
  if (!pack) {
    return [];
  }

  const byId = new Map(getStructureTacticsFile().puzzles.map((puzzle) => [puzzle.id, puzzle]));
  return pack.puzzleIds
    .map((id) => byId.get(id))
    .filter((puzzle): puzzle is StructurePuzzle => puzzle !== undefined);
}
