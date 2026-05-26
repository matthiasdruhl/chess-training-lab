import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Square } from 'chess.js';
import { ALLOW_SOLUTION_REVEAL } from '../constants/training';
import { HINT_DEPTH } from '../constants/engine';
import { DEBOUNCE_WRITE_MS } from '../constants/persistence';
import {
  getStructurePuzzleById,
  getTacticsPackById,
  listTacticsPacks,
} from '../services/tactics/loadStructureTactics';
import type { StructurePuzzle, TacticsPack, TacticsProgress } from '../types/tactics';
import {
  createDefaultTacticsProgress,
  getTacticsProgressForPack,
  nextTacticsStatusAfterCorrect,
  nextTacticsStatusAfterWrong,
  putTacticsProgress,
} from '../storage/tacticsProgressRepo';
import { useChessSession } from './useChessSession';
import { useStockfish } from './useStockfish';

export type StructureTacticsStep = 'attempt' | 'correct' | 'revealed';

function moveToUci(from: Square, to: Square, promotion?: 'q' | 'r' | 'b' | 'n'): string {
  return `${from}${to}${promotion ?? ''}`;
}

function isSolutionUci(puzzle: StructurePuzzle, uci: string): boolean {
  if (uci === puzzle.solutionUci) {
    return true;
  }
  return puzzle.solutionAliasesUci?.includes(uci) ?? false;
}

function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }
  return hash;
}

function puzzleQueuePriority(progress: TacticsProgress | undefined): number {
  if (!progress || progress.status === 'new') {
    return 0;
  }
  if (progress.solves === 0) {
    return 1;
  }
  if (progress.status === 'learning' || progress.status === 'review') {
    return 2;
  }
  return 3;
}

function buildPuzzleQueue(
  pack: TacticsPack,
  progressByPuzzleId: Map<string, TacticsProgress>,
): string[] {
  return [...pack.puzzleIds].sort((leftId, rightId) => {
    const leftPriority = puzzleQueuePriority(progressByPuzzleId.get(leftId));
    const rightPriority = puzzleQueuePriority(progressByPuzzleId.get(rightId));
    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority;
    }
    return hashString(`${pack.id}:${leftId}`) - hashString(`${pack.id}:${rightId}`);
  });
}

export function useStructureTactics(packIdFromQuery: string | null) {
  const packs = useMemo(() => listTacticsPacks(), []);

  const resolvePackId = useCallback(() => {
    if (packIdFromQuery && packs.some((pack) => pack.id === packIdFromQuery)) {
      return packIdFromQuery;
    }
    return packs[0]?.id ?? null;
  }, [packIdFromQuery, packs]);

  const [selectedPackId, setSelectedPackId] = useState<string | null>(resolvePackId);
  const selectedPack = useMemo(
    () => (selectedPackId ? getTacticsPackById(selectedPackId) : undefined),
    [selectedPackId],
  );

  const [progressByPuzzleId, setProgressByPuzzleId] = useState<Map<string, TacticsProgress>>(
    () => new Map(),
  );
  const [queue, setQueue] = useState<string[]>([]);
  const [queueIndex, setQueueIndex] = useState(0);

  const currentPuzzleId = queue[queueIndex] ?? null;
  const currentPuzzle = useMemo(
    () => (currentPuzzleId ? getStructurePuzzleById(currentPuzzleId) : undefined),
    [currentPuzzleId],
  );

  const { fen, loadFen, makeMove } = useChessSession(currentPuzzle?.fen);

  const [step, setStep] = useState<StructureTacticsStep>('attempt');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [engineHint, setEngineHint] = useState<string | null>(null);
  const [isLoadingHint, setIsLoadingHint] = useState(false);

  const pendingWriteRef = useRef<TacticsProgress | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const packLoadRequestRef = useRef(0);

  const { bestMove, isThinking } = useStockfish();

  const flushWrites = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    if (pendingWriteRef.current) {
      const record = pendingWriteRef.current;
      pendingWriteRef.current = null;
      void putTacticsProgress(record);
    }
  }, []);

  const persist = useCallback((record: TacticsProgress, immediate = false) => {
    setProgressByPuzzleId((prev) => {
      const next = new Map(prev);
      next.set(record.puzzleId, record);
      return next;
    });
    pendingWriteRef.current = record;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    if (immediate) {
      pendingWriteRef.current = null;
      void putTacticsProgress(record);
      return;
    }

    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      const toWrite = pendingWriteRef.current;
      pendingWriteRef.current = null;
      if (toWrite) {
        void putTacticsProgress(toWrite);
      }
    }, DEBOUNCE_WRITE_MS);
  }, []);

  const loadPack = useCallback(
    async (packId: string) => {
      flushWrites();
      const requestId = packLoadRequestRef.current + 1;
      packLoadRequestRef.current = requestId;

      const pack = getTacticsPackById(packId);
      if (!pack) {
        setSelectedPackId(null);
        setProgressByPuzzleId(new Map());
        setQueue([]);
        setQueueIndex(0);
        return;
      }

      setSelectedPackId(packId);
      setStep('attempt');
      setFeedback(null);
      setEngineHint(null);

      const existing = await getTacticsProgressForPack(packId);
      if (packLoadRequestRef.current !== requestId) {
        return;
      }

      const progressMap = new Map<string, TacticsProgress>();
      for (const puzzleId of pack.puzzleIds) {
        const record =
          existing.find((entry) => entry.puzzleId === puzzleId) ??
          createDefaultTacticsProgress(puzzleId, packId);
        progressMap.set(puzzleId, record);
      }

      const nextQueue = buildPuzzleQueue(pack, progressMap);
      setProgressByPuzzleId(progressMap);
      setQueue(nextQueue);
      setQueueIndex(0);

      const firstPuzzle = nextQueue[0] ? getStructurePuzzleById(nextQueue[0]) : undefined;
      if (firstPuzzle) {
        loadFen(firstPuzzle.fen);
      }
    },
    [flushWrites, loadFen],
  );

  useEffect(() => {
    const targetPackId = resolvePackId();
    if (targetPackId) {
      void loadPack(targetPackId);
    }
  }, [loadPack, packIdFromQuery, resolvePackId]);

  useEffect(() => {
    if (!currentPuzzle) {
      return;
    }
    loadFen(currentPuzzle.fen);
    setStep('attempt');
    setFeedback(null);
    setEngineHint(null);
  }, [currentPuzzle, loadFen]);

  const selectPack = useCallback(
    (packId: string) => {
      void loadPack(packId);
    },
    [loadPack],
  );

  const handleMove = useCallback(
    (from: Square, to: Square, promotion?: 'q' | 'r' | 'b' | 'n'): boolean => {
      if (!currentPuzzle || !selectedPackId || step !== 'attempt') {
        return false;
      }

      const uci = moveToUci(from, to, promotion);
      const now = new Date().toISOString();
      const existing =
        progressByPuzzleId.get(currentPuzzle.id) ??
        createDefaultTacticsProgress(currentPuzzle.id, selectedPackId);

      if (!isSolutionUci(currentPuzzle, uci)) {
        const updated: TacticsProgress = {
          ...existing,
          attempts: existing.attempts + 1,
          status: nextTacticsStatusAfterWrong(existing.status),
          lastAttemptAt: now,
        };
        setFeedback(currentPuzzle.themeHint);
        persist(updated, true);
        return false;
      }

      const applied = makeMove(from, to, promotion);
      if (!applied) {
        return false;
      }

      const solves = existing.solves + 1;
      const nextStatus = nextTacticsStatusAfterCorrect(existing.status, solves);
      const updated: TacticsProgress = {
        ...existing,
        attempts: existing.attempts + 1,
        solves,
        status: nextStatus,
        lastAttemptAt: now,
        masteredAt: nextStatus === 'mastered' ? now : existing.masteredAt,
      };

      setFeedback(null);
      setStep('correct');
      persist(updated, true);
      return true;
    },
    [currentPuzzle, makeMove, persist, progressByPuzzleId, selectedPackId, step],
  );

  const revealSolution = useCallback(() => {
    if (!ALLOW_SOLUTION_REVEAL || !currentPuzzle || !selectedPackId) {
      return;
    }

    const existing =
      progressByPuzzleId.get(currentPuzzle.id) ??
      createDefaultTacticsProgress(currentPuzzle.id, selectedPackId);
    const now = new Date().toISOString();

    persist(
      {
        ...existing,
        revealedSolution: true,
        lastAttemptAt: existing.lastAttemptAt ?? now,
      },
      true,
    );
    setStep('revealed');
    setFeedback(`Solution: ${currentPuzzle.solutionSan}`);
  }, [currentPuzzle, persist, progressByPuzzleId, selectedPackId]);

  const nextPuzzle = useCallback(() => {
    if (queueIndex < queue.length - 1) {
      setQueueIndex((index) => index + 1);
      return;
    }
    setFeedback('Pack complete — pick another pack or retry.');
  }, [queueIndex, queue.length]);

  const requestEngineHint = useCallback(async () => {
    if (!currentPuzzle || step !== 'attempt') {
      return;
    }

    setIsLoadingHint(true);
    try {
      const uci = await bestMove(currentPuzzle.fen, { depth: HINT_DEPTH });
      setEngineHint(uci);
    } catch {
      setEngineHint(null);
      setFeedback('Engine hint unavailable.');
    } finally {
      setIsLoadingHint(false);
    }
  }, [bestMove, currentPuzzle, step]);

  const currentProgress = currentPuzzle
    ? progressByPuzzleId.get(currentPuzzle.id)
    : undefined;

  const solvedCount = useMemo(() => {
    if (!selectedPack) {
      return 0;
    }
    return selectedPack.puzzleIds.filter((puzzleId) => {
      const progress = progressByPuzzleId.get(puzzleId);
      return progress && progress.solves > 0;
    }).length;
  }, [progressByPuzzleId, selectedPack]);

  useEffect(() => {
    const onBeforeUnload = () => flushWrites();
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [flushWrites]);

  useEffect(() => {
    return () => {
      flushWrites();
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [flushWrites]);

  return {
    packs,
    selectedPack,
    selectedPackId,
    selectPack,
    currentPuzzle,
    currentProgress,
    queueIndex,
    queueLength: queue.length,
    solvedCount,
    fen,
    step,
    feedback,
    engineHint,
    isLoadingHint,
    isThinking,
    handleMove,
    revealSolution,
    nextPuzzle,
    requestEngineHint,
    orientation: currentPuzzle?.sideToMove ?? 'white',
    isBoardLocked: step !== 'attempt',
    allowSolutionReveal: ALLOW_SOLUTION_REVEAL,
  };
}
