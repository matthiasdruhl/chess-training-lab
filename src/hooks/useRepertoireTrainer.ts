import { useCallback, useEffect, useRef, useState } from 'react';
import type { Square } from 'chess.js';
import { OPPONENT_REPLY_DELAY_MS } from '../constants/engine';
import { DEBOUNCE_WRITE_MS } from '../constants/persistence';
import { loadRepertoire } from '../services/repertoire/loadRepertoire';
import {
  findNodeById,
  flattenTrainableNodes,
  getRootByColor,
  getTrainingStart,
  isUserPly,
} from '../services/repertoire/treeUtils';
import { verifyMove } from '../services/repertoire/verifyMove';
import {
  createDefaultProgress,
  getProgress,
  putProgress,
} from '../storage/progressRepo';
import type {
  FlattenedRepertoireNode,
  RepertoireColor,
  RepertoireNode,
  RepertoireProgress,
} from '../types/repertoire';
import { useChessSession } from './useChessSession';

export type TrainerPhase = 'idle' | 'training' | 'complete' | 'mistake';

function moveToUci(from: Square, to: Square, promotion?: 'q' | 'r' | 'b' | 'n'): string {
  return `${from}${to}${promotion ?? ''}`;
}

function nextStatusAfterCompletion(current: RepertoireProgress): RepertoireProgress['status'] {
  if (current.status === 'known') {
    return 'known';
  }
  if (current.successfulCompletions >= 2) {
    return 'review';
  }
  return 'learning';
}

export function useRepertoireTrainer() {
  const repertoire = loadRepertoire();
  const [selectedColor, setSelectedColor] = useState<RepertoireColor>('white');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [plyIndex, setPlyIndex] = useState(0);
  const [phase, setPhase] = useState<TrainerPhase>('idle');
  const [showIntent, setShowIntent] = useState(false);
  const [progressMap, setProgressMap] = useState<Record<string, RepertoireProgress>>({});
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const {
    fen,
    loadFen,
    makeMove,
    applyUciMove,
    reset: resetBoard,
  } = useChessSession();

  const selectedEntry = selectedNodeId
    ? findNodeById(repertoire, selectedNodeId)
    : undefined;
  const selectedNode = selectedEntry?.node;
  const selectedRoot = selectedEntry?.root;
  const currentProgress = selectedNodeId ? progressMap[selectedNodeId] : undefined;

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingProgressRef = useRef<RepertoireProgress | null>(null);
  const autoPlayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushProgressWrites = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    const pending = pendingProgressRef.current;
    if (pending) {
      pendingProgressRef.current = null;
      void putProgress(pending);
    }
  }, []);

  const persistProgress = useCallback((record: RepertoireProgress, immediate = false) => {
    setProgressMap((prev) => ({ ...prev, [record.nodeId]: record }));
    pendingProgressRef.current = record;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    if (immediate) {
      pendingProgressRef.current = null;
      void putProgress(record);
      return;
    }

    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      const toWrite = pendingProgressRef.current;
      pendingProgressRef.current = null;
      if (toWrite) {
        void putProgress(toWrite);
      }
    }, DEBOUNCE_WRITE_MS);
  }, []);

  const changeColor = useCallback((color: RepertoireColor) => {
    flushProgressWrites();
    if (autoPlayTimerRef.current) {
      clearTimeout(autoPlayTimerRef.current);
      autoPlayTimerRef.current = null;
    }
    setSelectedColor(color);
    setSelectedNodeId(null);
    setPhase('idle');
    setShowIntent(false);
    setFeedback(null);
    setIsAutoPlaying(false);
    resetBoard();
  }, [flushProgressWrites, resetBoard]);

  const loadProgressForNodes = useCallback(async (nodes: FlattenedRepertoireNode[]) => {
    const entries = await Promise.all(
      nodes.map(async ({ node, color }) => {
        const existing = await getProgress(node.id);
        return [node.id, existing ?? createDefaultProgress(node.id, color)] as const;
      }),
    );
    setProgressMap(Object.fromEntries(entries));
  }, []);

  const rootForColor = getRootByColor(repertoire, selectedColor);
  const treeNodes = rootForColor ? flattenTrainableNodes(rootForColor) : [];

  useEffect(() => {
    const root = getRootByColor(repertoire, selectedColor);
    if (!root) {
      return;
    }
    void loadProgressForNodes(flattenTrainableNodes(root));
  }, [selectedColor, loadProgressForNodes, repertoire]);

  const completeLineRef = useRef<() => void>(() => {});

  const autoPlayOpponentMoves = useCallback(
    (node: RepertoireNode, color: RepertoireColor, startPly: number, delayMs = 0) => {
      if (autoPlayTimerRef.current) {
        clearTimeout(autoPlayTimerRef.current);
        autoPlayTimerRef.current = null;
      }

      const playNext = (currentPly: number, replyDelay: number) => {
        if (currentPly >= node.pathUci.length) {
          setPlyIndex(currentPly);
          setIsAutoPlaying(false);
          completeLineRef.current();
          return;
        }

        if (isUserPly(currentPly, color)) {
          setPlyIndex(currentPly);
          setIsAutoPlaying(false);
          setPhase('training');
          return;
        }

        if (!node.trainer.autoReply) {
          setPlyIndex(currentPly);
          setIsAutoPlaying(false);
          setPhase('training');
          return;
        }

        setIsAutoPlaying(true);
        autoPlayTimerRef.current = setTimeout(() => {
          const uci = node.pathUci[currentPly];
          if (!uci || !applyUciMove(uci)) {
            setIsAutoPlaying(false);
            setPhase('training');
            return;
          }
          playNext(currentPly + 1, OPPONENT_REPLY_DELAY_MS);
        }, replyDelay);
      };

      playNext(startPly, delayMs);
    },
    [applyUciMove],
  );

  const resetLine = useCallback(() => {
    if (!selectedNode || !selectedRoot) {
      return;
    }

    if (autoPlayTimerRef.current) {
      clearTimeout(autoPlayTimerRef.current);
      autoPlayTimerRef.current = null;
    }

    const start = getTrainingStart(selectedNode);
    loadFen(start.fen);
    setPlyIndex(start.plyIndex);
    setShowIntent(false);
    setFeedback(null);
    setPhase('training');
    autoPlayOpponentMoves(
      selectedNode,
      selectedRoot.color,
      start.plyIndex,
      start.plyIndex === (selectedNode.branchPoint ?? 0) ? 0 : OPPONENT_REPLY_DELAY_MS,
    );
  }, [autoPlayOpponentMoves, loadFen, selectedNode, selectedRoot]);

  const selectNode = useCallback(
    (nodeId: string) => {
      const entry = findNodeById(repertoire, nodeId);
      if (!entry || entry.node.pathUci.length === 0) {
        return;
      }

      flushProgressWrites();
      if (autoPlayTimerRef.current) {
        clearTimeout(autoPlayTimerRef.current);
        autoPlayTimerRef.current = null;
      }

      setSelectedNodeId(nodeId);
      setSelectedColor(entry.root.color);
      setShowIntent(false);
      setFeedback(null);

      const start = getTrainingStart(entry.node);
      loadFen(start.fen);
      setPlyIndex(start.plyIndex);
      setPhase('training');
      autoPlayOpponentMoves(entry.node, entry.root.color, start.plyIndex);
    },
    [autoPlayOpponentMoves, flushProgressWrites, loadFen, repertoire],
  );

  const completeLine = useCallback(() => {
    if (!selectedNode || !selectedRoot) {
      return;
    }

    const base = progressMap[selectedNode.id] ?? createDefaultProgress(
      selectedNode.id,
      selectedRoot.color,
    );
    const now = new Date().toISOString();
    const streak = base.streak + 1;
    const updated: RepertoireProgress = {
      ...base,
      streak,
      bestStreak: Math.max(base.bestStreak, streak),
      successfulCompletions: base.successfulCompletions + 1,
      attempts: base.attempts + 1,
      lastPracticedAt: now,
      status: nextStatusAfterCompletion(base),
    };
    persistProgress(updated, true);
    setFeedback('Line complete — nice work.');
    setPhase('complete');
  }, [persistProgress, progressMap, selectedNode, selectedRoot]);

  completeLineRef.current = completeLine;

  const handleWrongMove = useCallback(() => {
    if (!selectedNode || !selectedRoot) {
      return false;
    }

    const base = progressMap[selectedNode.id] ?? createDefaultProgress(
      selectedNode.id,
      selectedRoot.color,
    );
    const updated: RepertoireProgress = {
      ...base,
      streak: 0,
      attempts: base.attempts + 1,
      lastPracticedAt: new Date().toISOString(),
    };
    persistProgress(updated);

    if (selectedNode.trainer.hints.showIntentAfterMistake) {
      setShowIntent(true);
    }
    setFeedback('Not the book move.');
    setPhase('mistake');

    if (selectedNode.trainer.mode === 'strict') {
      setTimeout(() => {
        resetLine();
      }, OPPONENT_REPLY_DELAY_MS);
    }

    return false;
  }, [persistProgress, progressMap, resetLine, selectedNode, selectedRoot]);

  const advanceAfterCorrectUserMove = useCallback(
    (nextPly: number) => {
      if (!selectedNode || !selectedRoot) {
        return;
      }

      if (nextPly >= selectedNode.pathUci.length) {
        completeLine();
        return;
      }

      autoPlayOpponentMoves(
        selectedNode,
        selectedRoot.color,
        nextPly,
        OPPONENT_REPLY_DELAY_MS,
      );
    },
    [autoPlayOpponentMoves, completeLine, selectedNode, selectedRoot],
  );

  const handleMove = useCallback(
    (from: Square, to: Square, promotion?: 'q' | 'r' | 'b' | 'n'): boolean => {
      if (!selectedNode || !selectedRoot || isAutoPlaying) {
        return false;
      }
      if (phase !== 'training' && phase !== 'mistake') {
        return false;
      }
      if (phase === 'mistake' && selectedNode.trainer.mode === 'strict') {
        return false;
      }
      if (!isUserPly(plyIndex, selectedRoot.color)) {
        return false;
      }

      const userUci = moveToUci(from, to, promotion);
      const expectedUci = selectedNode.pathUci[plyIndex];
      const aliases = selectedNode.aliasesUci?.[plyIndex];

      if (!verifyMove(userUci, expectedUci, aliases)) {
        return handleWrongMove();
      }

      const applied = makeMove(from, to, promotion);
      if (!applied) {
        return false;
      }

      setShowIntent(false);
      setFeedback(null);
      setPhase('training');
      advanceAfterCorrectUserMove(plyIndex + 1);
      return true;
    },
    [
      advanceAfterCorrectUserMove,
      handleWrongMove,
      isAutoPlaying,
      makeMove,
      phase,
      plyIndex,
      selectedNode,
      selectedRoot,
    ],
  );

  const markKnown = useCallback(() => {
    if (!selectedNode || !selectedRoot) {
      return;
    }
    const base = progressMap[selectedNode.id] ?? createDefaultProgress(
      selectedNode.id,
      selectedRoot.color,
    );
    persistProgress(
      {
        ...base,
        status: 'known',
        lastPracticedAt: new Date().toISOString(),
      },
      true,
    );
    setFeedback('Marked as known.');
  }, [persistProgress, progressMap, selectedNode, selectedRoot]);

  const showHint = useCallback(() => {
    setShowIntent(true);
  }, []);

  useEffect(() => {
    return () => {
      flushProgressWrites();
      if (autoPlayTimerRef.current) {
        clearTimeout(autoPlayTimerRef.current);
      }
    };
  }, [flushProgressWrites]);

  const isBoardLocked =
    isAutoPlaying ||
    (phase === 'mistake' && selectedNode?.trainer.mode === 'strict');

  const displayedMoves = selectedNode
    ? selectedNode.pathSan.slice(0, Math.min(plyIndex, selectedNode.pathSan.length))
    : [];

  return {
    repertoire,
    selectedColor,
    changeColor,
    selectedNodeId,
    selectedNode,
    selectedRoot,
    treeNodes,
    progressMap,
    fen,
    plyIndex,
    phase,
    showIntent,
    feedback,
    isAutoPlaying,
    isBoardLocked,
    displayedMoves,
    currentProgress,
    selectNode,
    resetLine,
    handleMove,
    markKnown,
    showHint,
  };
}
