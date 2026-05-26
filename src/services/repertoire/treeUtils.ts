import { Chess, type Square } from 'chess.js';
import type {
  FlattenedRepertoireNode,
  RepertoireColor,
  RepertoireFile,
  RepertoireNode,
  RepertoireRoot,
  TrainingStart,
} from '../../types/repertoire';

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

function applyUciMove(game: Chess, uci: string): boolean {
  if (uci.length < 4) {
    return false;
  }
  const from = uci.slice(0, 2) as Square;
  const to = uci.slice(2, 4) as Square;
  const promoChar = uci[4];
  const promotion =
    promoChar === 'q' || promoChar === 'r' || promoChar === 'b' || promoChar === 'n'
      ? promoChar
      : undefined;
  try {
    const move = game.move({ from, to, promotion: promotion ?? 'q' });
    return move !== null;
  } catch {
    return false;
  }
}

export function isUserPly(plyIndex: number, color: RepertoireColor): boolean {
  return color === 'white' ? plyIndex % 2 === 0 : plyIndex % 2 === 1;
}

export function getTrainingStart(node: RepertoireNode): TrainingStart {
  const branchPoint = node.branchPoint ?? 0;
  const game = new Chess(START_FEN);
  for (let i = 0; i < branchPoint; i += 1) {
    const uci = node.pathUci[i];
    if (!uci || !applyUciMove(game, uci)) {
      break;
    }
  }
  return { fen: game.fen(), plyIndex: branchPoint };
}

export function findNodeById(
  file: RepertoireFile,
  nodeId: string,
): { node: RepertoireNode; root: RepertoireRoot } | undefined {
  for (const root of file.roots) {
    const found = findNodeInTree(root.tree, nodeId);
    if (found) {
      return { node: found, root };
    }
  }
  return undefined;
}

function findNodeInTree(node: RepertoireNode, nodeId: string): RepertoireNode | undefined {
  if (node.id === nodeId) {
    return node;
  }
  for (const child of node.children) {
    const found = findNodeInTree(child, nodeId);
    if (found) {
      return found;
    }
  }
  return undefined;
}

export function flattenTrainableNodes(root: RepertoireRoot): FlattenedRepertoireNode[] {
  const result: FlattenedRepertoireNode[] = [];

  function walk(node: RepertoireNode, depth: number) {
    if (node.pathUci.length > 0) {
      result.push({
        node,
        color: root.color,
        opening: root.opening,
        depth,
      });
    }
    for (const child of node.children) {
      walk(child, depth + 1);
    }
  }

  walk(root.tree, 0);
  return result.sort(
    (a, b) => a.node.priority - b.node.priority || a.node.name.localeCompare(b.node.name),
  );
}

export function getRootByColor(
  file: RepertoireFile,
  color: RepertoireColor,
): RepertoireRoot | undefined {
  return file.roots.find((root) => root.color === color);
}
