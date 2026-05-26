import { Chess } from 'chess.js';
import { applyUciToGame, START_FEN } from '../chess/uci';
import type {
  FlattenedRepertoireNode,
  RepertoireColor,
  RepertoireFile,
  RepertoireNode,
  RepertoireRoot,
  TrainingStart,
} from '../../types/repertoire';

export function isUserPly(plyIndex: number, color: RepertoireColor): boolean {
  return color === 'white' ? plyIndex % 2 === 0 : plyIndex % 2 === 1;
}

export function getTrainingStart(node: RepertoireNode): TrainingStart {
  const branchPoint = node.branchPoint ?? 0;
  const game = new Chess(START_FEN);
  for (let i = 0; i < branchPoint; i += 1) {
    const uci = node.pathUci[i];
    if (!uci || !applyUciToGame(game, uci, { defaultPromotion: 'q' })) {
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
