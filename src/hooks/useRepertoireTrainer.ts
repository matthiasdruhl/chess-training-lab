/* eslint-disable react-hooks/preserve-manual-memoization */
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
  const successfulCompletions = current.successfulCompletions + 1;
  if (successfulCompletions >= 2) {
    return 'review';
  }
  return 'learning';
}

function computeNextReviewAt(record: RepertoireProgress, now: Date): string | null {
  if (record.status === 'known') {
    return null;
  }

  if (record.status === 'new' || record.status === 'learning') {
    return null;
  }

  const next = new Date(now);
  next.setDate(next.getDate() + 1);
  return next.toISOString();
}

export function useRepertoireTrainer(initialNodeIdFromQuery: string | null = null) {
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
    draggableSquares,
  } = useChessSession();

  const selectedEntry = selectedNodeId
    ? findNodeById(repertoire, selectedNodeId)
    : undefined;
  const selectedNode = selectedEntry?.node;
  const selectedRoot = selectedEntry?.root;
  const currentProgress = selectedNodeId ? progressMap[selectedNodeId] : undefined;

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingProgressRef = useRef<Record<string, RepertoireProgress>>({});
  const autoPlayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const strictResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialNodeHandledRef = useRef(false);

  const flushProgressWrites = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    const pending = pendingProgressRef.current;
    const records = Object.values(pending);
    if (records.length > 0) {
      pendingProgressRef.current = {};
      void Promise.all(records.map((record) => putProgress(record)));
    }
  }, []);

  const persistProgress = useCallback((record: RepertoireProgress, immediate = false) => {
    setProgressMap((prev) => ({ ...prev, [record.nodeId]: record }));
    pendingProgressRef.current = {
      ...pendingProgressRef.current,
      [record.nodeId]: record,
    };

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    if (immediate) {
      const nextPending = { ...pendingProgressRef.current };
      delete nextPending[record.nodeId];
      pendingProgressRef.current = nextPending;
      void putProgress(record);
      return;
    }

    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      const toWrite = pendingProgressRef.current;
      pendingProgressRef.current = {};
      const records = Object.values(toWrite);
      if (records.length > 0) {
        void Promise.all(records.map((item) => putProgress(item)));
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

  const loadProgressForNodes = useCallback(
    async (nodes: FlattenedRepertoireNode[]) => {
      const entries = await Promise.all(
        nodes.map(async ({ node, color }) => {
          const existing = await getProgress(node.id);
          return [node.id, existing ?? createDefaultProgress(node.id, color)] as const;
        }),
      );
      return Object.fromEntries(entries) as Record<string, RepertoireProgress>;
    },
    [],
  );

  const rootForColor = getRootByColor(repertoire, selectedColor);
  const treeNodes = rootForColor ? flattenTrainableNodes(rootForColor) : [];

  useEffect(() => {
    const root = getRootByColor(repertoire, selectedColor);
    if (!root) {
      return;
    }

    let cancelled = false;
    const nodes = flattenTrainableNodes(root);

    void (async () => {
      const map = await loadProgressForNodes(nodes);
      if (!cancelled) {
        setProgressMap(map);
      }
    })();

    return () => {
      cancelled = true;
    };
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
    if (strictResetTimerRef.current) {
      clearTimeout(strictResetTimerRef.current);
      strictResetTimerRef.current = null;
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

  useEffect(() => {
    if (!initialNodeIdFromQuery || initialNodeHandledRef.current) {
      return;
    }

    const entry = findNodeById(repertoire, initialNodeIdFromQuery);
    if (!entry || entry.node.pathUci.length === 0) {
      return;
    }

    initialNodeHandledRef.current = true;
    selectNode(initialNodeIdFromQuery);
  }, [initialNodeIdFromQuery, repertoire, selectNode]);

  const completeLine = useCallback(() => {
    if (!selectedNode || !selectedRoot) {
      return;
    }

    const base = progressMap[selectedNode.id] ?? createDefaultProgress(
      selectedNode.id,
      selectedRoot.color,
    );
    const nowDate = new Date();
    const now = nowDate.toISOString();
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
    updated.nextReviewAt = computeNextReviewAt(updated, nowDate);
    persistProgress(updated, true);
    setFeedback('Line complete — nice work.');
    setPhase('complete');
  }, [persistProgress, progressMap, selectedNode, selectedRoot]);
  useEffect(() => {
    completeLineRef.current = completeLine;
  }, [completeLine]);

  const handleWrongMove = useCallback(() => {
    if (!selectedNode || !selectedRoot) {
      return false;
    }

    const base = progressMap[selectedNode.id] ?? createDefaultProgress(
      selectedNode.id,
      selectedRoot.color,
    );
    const nowDate = new Date();
    const now = nowDate.toISOString();
    const updated: RepertoireProgress = {
      ...base,
      streak: 0,
      attempts: base.attempts + 1,
      lastPracticedAt: now,
    };
    updated.nextReviewAt = computeNextReviewAt(updated, nowDate);
    persistProgress(updated);

    if (selectedNode.trainer.hints.showIntentAfterMistake) {
      setShowIntent(true);
    }
    setFeedback('Not the book move.');
    setPhase('mistake');

    if (selectedNode.trainer.mode === 'strict') {
      if (strictResetTimerRef.current) {
        clearTimeout(strictResetTimerRef.current);
        strictResetTimerRef.current = null;
      }
      strictResetTimerRef.current = setTimeout(() => {
        strictResetTimerRef.current = null;
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
    const nowDate = new Date();
    const now = nowDate.toISOString();
    const updated: RepertoireProgress = {
      ...base,
      status: 'known',
      lastPracticedAt: now,
      nextReviewAt: computeNextReviewAt(
        {
          ...base,
          status: 'known',
        },
        nowDate,
      ),
    };
    persistProgress(updated, true);
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
      if (strictResetTimerRef.current) {
        clearTimeout(strictResetTimerRef.current);
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
    draggableSquares,
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
