import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Chess } from 'chess.js';
import { applyUciToGame, START_FEN } from '../src/services/chess/uci';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function loadJson<T>(relativePath: string): T {
  const raw = readFileSync(join(root, relativePath), 'utf8');
  return JSON.parse(raw) as T;
}

type RepertoireNode = {
  id: string;
  branchPoint?: number;
  pathUci: string[];
  fen?: string;
  children: RepertoireNode[];
};

const errors: string[] = [];

function replayPathUci(pathUci: string[], branchPoint = 0): string {
  const game = new Chess(START_FEN);
  for (let i = 0; i < branchPoint; i += 1) {
    const uci = pathUci[i];
    if (!uci || !applyUciToGame(game, uci, { defaultPromotion: 'q' })) {
      throw new Error(`Failed replay at ply ${i}: ${uci}`);
    }
  }
  return game.fen();
}

function walkRepertoire(node: RepertoireNode) {
  if (node.pathUci.length > 0) {
    try {
      replayPathUci(node.pathUci, node.branchPoint ?? 0);
    } catch (err) {
      errors.push(`repertoire node ${node.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  for (const child of node.children) {
    walkRepertoire(child);
  }
}

const repertoire = loadJson<{ roots: { tree: RepertoireNode }[] }>(
  'data/repertoire/queens-gambit-caro-kann.json',
);
const nodeIds = new Set<string>();

function collectNodeIds(node: RepertoireNode) {
  nodeIds.add(node.id);
  for (const child of node.children) {
    collectNodeIds(child);
  }
}

for (const root of repertoire.roots) {
  collectNodeIds(root.tree);
  walkRepertoire(root.tree);
}

const presets = loadJson<{ presets: { id: string }[] }>('data/presets/structures-and-endgames.json');
const presetIds = new Set(presets.presets.map((p) => p.id));

const tactics = loadJson<{
  packs: { puzzleIds: string[]; relatedPresetId?: string }[];
  puzzles: { id: string; fen: string; solutionUci: string }[];
}>('data/tactics/structure-tactics.json');
const puzzleIds = new Set(tactics.puzzles.map((p) => p.id));

for (const pack of tactics.packs) {
  for (const id of pack.puzzleIds) {
    if (!puzzleIds.has(id)) {
      errors.push(`tactics pack references missing puzzleId: ${id}`);
    }
  }
  if (pack.relatedPresetId && !presetIds.has(pack.relatedPresetId)) {
    errors.push(`tactics pack relatedPresetId missing preset: ${pack.relatedPresetId}`);
  }
}

for (const puzzle of tactics.puzzles) {
  try {
    new Chess(puzzle.fen);
    const after = new Chess(puzzle.fen);
    if (!applyUciToGame(after, puzzle.solutionUci, { defaultPromotion: 'q' })) {
      errors.push(`tactics puzzle ${puzzle.id}: illegal solutionUci ${puzzle.solutionUci}`);
    }
  } catch {
    errors.push(`tactics puzzle ${puzzle.id}: invalid fen`);
  }
}

const deviations = loadJson<{ deviations: { parentNodeId: string; fen: string }[] }>(
  'data/out-of-book/deviations.json',
);
for (const deviation of deviations.deviations) {
  if (!nodeIds.has(deviation.parentNodeId)) {
    errors.push(`deviation parentNodeId not in repertoire: ${deviation.parentNodeId}`);
  }
  try {
    new Chess(deviation.fen);
  } catch {
    errors.push(`deviation invalid fen: ${deviation.parentNodeId}`);
  }
}

const handoffs = loadJson<{
  handoffs: { repertoireNodeId: string; linkedPresetId: string; handoffFen: string }[];
}>('data/bridge/handoffs.json');
for (const handoff of handoffs.handoffs) {
  if (!nodeIds.has(handoff.repertoireNodeId)) {
    errors.push(`bridge handoff repertoireNodeId missing: ${handoff.repertoireNodeId}`);
  }
  if (!presetIds.has(handoff.linkedPresetId)) {
    errors.push(`bridge handoff linkedPresetId missing: ${handoff.linkedPresetId}`);
  }
  try {
    new Chess(handoff.handoffFen);
  } catch {
    errors.push(`bridge handoff invalid fen: ${handoff.repertoireNodeId}`);
  }
}

const puzzleCount = tactics.puzzles.length;
if (puzzleCount < 20) {
  console.warn(`Content milestone M5: ${puzzleCount}/20 tactics puzzles (not a validation failure).`);
}

if (errors.length > 0) {
  console.error('Content validation failed:\n' + errors.map((e) => `  - ${e}`).join('\n'));
  process.exit(1);
}

console.log(`Content validation passed (${puzzleCount} tactics puzzles).`);
