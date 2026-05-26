import { describe, expect, it } from 'vitest';
import { loadRepertoire } from './loadRepertoire';
import { findNodeById, getTrainingStart } from './treeUtils';

describe('treeUtils', () => {
  const file = loadRepertoire();

  it('replays pathUci to training start FEN for trainable nodes', () => {
    for (const root of file.roots) {
      const walk = (node: (typeof root.tree)) => {
        if (node.pathUci.length > 0) {
          const start = getTrainingStart(node);
          expect(start.plyIndex).toBe(node.branchPoint ?? 0);
          expect(start.fen).toMatch(/ [wb] /);
        }
        for (const child of node.children) {
          walk(child);
        }
      };
      walk(root.tree);
    }
  });

  it('resolves known node ids', () => {
    const qg = findNodeById(file, 'qg-qgd-exchange');
    expect(qg?.node.id).toBe('qg-qgd-exchange');
  });
});
