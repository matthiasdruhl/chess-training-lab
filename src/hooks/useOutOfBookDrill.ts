import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Square } from 'chess.js';
import { DEBOUNCE_WRITE_MS } from '../constants/persistence';
import { getDeviationValidationError, listDeviations } from '../services/out-of-book/loadDeviations';
import type { OutOfBookDeviation, OutOfBookOptionalContinuation, OutOfBookProgress } from '../types/outOfBook';
import {
  createDefaultOutOfBookProgress,
  getOutOfBookProgress,
  nextOutOfBookStatusAfterSuccess,
  putOutOfBookProgress,
} from '../storage/outOfBookRepo';
import { useChessSession } from './useChessSession';
import { OPPONENT_REPLY_DELAY_MS } from '../constants/engine';

export type OutOfBookDrillStep = 'plan' | 'move' | 'continuation' | 'complete';

function moveToUci(from: Square, to: Square, promotion?: 'q' | 'r' | 'b' | 'n'): string {
  return `${from}${to}${promotion ?? ''}`;
}

function getOpponentAutoPlays(cont: OutOfBookOptionalContinuation): string[] {
  if (cont.opponentReplies.length <= 1) {
    return cont.opponentReplies;
  }
  return cont.opponentReplies.slice(0, -1);
}

function getContinuationExpectedUci(cont: OutOfBookOptionalContinuation): string | null {
  if (cont.opponentReplies.length > 1) {
    return cont.opponentReplies[cont.opponentReplies.length - 1] ?? null;
  }
  return null;
}

function triggersContinuation(deviation: OutOfBookDeviation, uci: string): boolean {
  return Boolean(
    deviation.optionalContinuation && deviation.optionalContinuation.userUci === uci,
  );
}

export function useOutOfBookDrill(deviationIdFromQuery: string | null, parentNodeIdFromQuery: string | null) {
  const { allDeviations, dataError } = useMemo(() => {
    try {
      return {
        allDeviations: listDeviations(),
        dataError: getDeviationValidationError(),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load out-of-book deviations.';
      return { allDeviations: [] as OutOfBookDeviation[], dataError: message };
    }
  }, []);

  const filteredDeviations = useMemo(() => {
    if (!parentNodeIdFromQuery) {
      return allDeviations;
    }
    return allDeviations.filter((deviation) => deviation.parentNodeId === parentNodeIdFromQuery);
  }, [allDeviations, parentNodeIdFromQuery]);

  const resolveDeviationId = useCallback(
    () => {
      if (deviationIdFromQuery && filteredDeviations.some((d) => d.id === deviationIdFromQuery)) {
        return deviationIdFromQuery;
      }
      return filteredDeviations[0]?.id ?? null;
    },
    [deviationIdFromQuery, filteredDeviations],
  );

  const [selectedDeviationId, setSelectedDeviationId] = useState<string | null>(resolveDeviationId);

  const selectedDeviation: OutOfBookDeviation | undefined = useMemo(
    () => filteredDeviations.find((d) => d.id === selectedDeviationId),
    [filteredDeviations, selectedDeviationId],
  );

  const { fen, loadFen, applyUciMove, makeMove, draggableSquares } = useChessSession(
    selectedDeviation?.fen,
  );

  const [step, setStep] = useState<OutOfBookDrillStep>('plan');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);

  const [progress, setProgress] = useState<OutOfBookProgress | null>(null);
  const pendingWriteRef = useRef<OutOfBookProgress | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoPlayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectionRequestIdRef = useRef(0);
  const clearSelectionStateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectDeviationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearSelectionState = useCallback(() => {
    selectionRequestIdRef.current += 1;
    setSelectedDeviationId(null);
    setStep('plan');
    setFeedback(null);
    setSelectedPlanId(null);
    setIsAutoPlaying(false);
    setProgress(null);
  }, []);
  const scheduleClearSelectionState = useCallback(() => {
    if (clearSelectionStateTimerRef.current) {
      clearTimeout(clearSelectionStateTimerRef.current);
    }
    clearSelectionStateTimerRef.current = setTimeout(() => {
      clearSelectionStateTimerRef.current = null;
      clearSelectionState();
    }, 0);
  }, [clearSelectionState]);

  const flushWrites = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    if (pendingWriteRef.current) {
      const record = pendingWriteRef.current;
      pendingWriteRef.current = null;
      void putOutOfBookProgress(record);
    }
  }, []);

  const persist = useCallback((record: OutOfBookProgress, immediate = false) => {
    setProgress(record);
    pendingWriteRef.current = record;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    if (immediate) {
      pendingWriteRef.current = null;
      void putOutOfBookProgress(record);
      return;
    }

    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      const toWrite = pendingWriteRef.current;
      pendingWriteRef.current = null;
      if (toWrite) {
        void putOutOfBookProgress(toWrite);
      }
    }, DEBOUNCE_WRITE_MS);
  }, []);

  const selectDeviation = useCallback(
    async (deviationId: string) => {
      flushWrites();
      const requestId = selectionRequestIdRef.current + 1;
      selectionRequestIdRef.current = requestId;

      if (autoPlayTimerRef.current) {
        clearTimeout(autoPlayTimerRef.current);
        autoPlayTimerRef.current = null;
      }

      const deviation = filteredDeviations.find((d) => d.id === deviationId);
      if (!deviation) {
        clearSelectionState();
        return;
      }

      setSelectedDeviationId(deviationId);
      setStep('plan');
      setFeedback(null);
      setSelectedPlanId(null);
      setIsAutoPlaying(false);
      loadFen(deviation.fen);

      const existing = await getOutOfBookProgress(deviationId);
      if (selectionRequestIdRef.current !== requestId) {
        return;
      }
      setProgress(existing ?? createDefaultOutOfBookProgress(deviationId, deviation.parentNodeId));
    },
    [clearSelectionState, filteredDeviations, flushWrites, loadFen],
  );
  const scheduleSelectDeviation = useCallback(
    (deviationId: string) => {
      if (selectDeviationTimerRef.current) {
        clearTimeout(selectDeviationTimerRef.current);
      }
      selectDeviationTimerRef.current = setTimeout(() => {
        selectDeviationTimerRef.current = null;
        void selectDeviation(deviationId);
      }, 0);
    },
    [selectDeviation],
  );

  useEffect(() => {
    const targetId = resolveDeviationId();
    if (!targetId) {
      flushWrites();
      if (autoPlayTimerRef.current) {
        clearTimeout(autoPlayTimerRef.current);
        autoPlayTimerRef.current = null;
      }
      if (selectedDeviationId !== null || progress !== null || isAutoPlaying || selectedPlanId !== null || feedback !== null) {
        scheduleClearSelectionState();
      }
      return;
    }

    if (targetId !== selectedDeviationId) {
      scheduleSelectDeviation(targetId);
    }
  }, [
    clearSelectionState,
    feedback,
    flushWrites,
    isAutoPlaying,
    progress,
    resolveDeviationId,
    scheduleClearSelectionState,
    scheduleSelectDeviation,
    selectedDeviationId,
    selectedPlanId,
  ]);

  const choosePlan = useCallback(
    (planId: string) => {
      if (!selectedDeviation || !progress || step !== 'plan') {
        return;
      }

      const choice = selectedDeviation.planChoices.find((c) => c.id === planId);
      if (!choice) {
        return;
      }

      const now = new Date().toISOString();
      const updated: OutOfBookProgress = {
        ...progress,
        planQuizAttempts: progress.planQuizAttempts + 1,
        lastPracticedAt: now,
      };

      setSelectedPlanId(planId);

      if (!choice.correct) {
        setFeedback(choice.feedback || 'Not the best plan here.');
        persist(updated, true);
        return;
      }

      setFeedback(null);
      setStep('move');
      persist(
        {
          ...updated,
          planQuizCorrect: progress.planQuizCorrect + 1,
        },
        true,
      );
    },
    [persist, progress, selectedDeviation, step],
  );

  const completeDeviation = useCallback(
    (record: OutOfBookProgress) => {
      setStep('complete');
      setFeedback('Deviation complete — progress saved.');
      persist(record, true);
    },
    [persist],
  );

  const autoPlayContinuation = useCallback(
    (movesUci: string[], onComplete?: () => void) => {
      if (movesUci.length === 0) {
        setIsAutoPlaying(false);
        onComplete?.();
        return;
      }

      setIsAutoPlaying(true);
      let index = 0;
      const playNext = () => {
        const uci = movesUci[index];
        index += 1;
        if (uci) {
          applyUciMove(uci);
        }
        if (index >= movesUci.length) {
          setIsAutoPlaying(false);
          autoPlayTimerRef.current = null;
          onComplete?.();
          return;
        }
        autoPlayTimerRef.current = setTimeout(playNext, OPPONENT_REPLY_DELAY_MS);
      };

      autoPlayTimerRef.current = setTimeout(playNext, OPPONENT_REPLY_DELAY_MS);
    },
    [applyUciMove],
  );

  const handleMove = useCallback(
    (from: Square, to: Square, promotion?: 'q' | 'r' | 'b' | 'n'): boolean => {
      if (!selectedDeviation || !progress || isAutoPlaying) {
        return false;
      }

      if (step !== 'move' && step !== 'continuation') {
        return false;
      }

      const uci = moveToUci(from, to, promotion);
      const now = new Date().toISOString();

      if (step === 'continuation') {
        const cont = selectedDeviation.optionalContinuation;
        if (!cont) {
          return false;
        }

        const expectedUci = getContinuationExpectedUci(cont);
        const updatedBase: OutOfBookProgress = {
          ...progress,
          moveAttempts: progress.moveAttempts + 1,
          lastPracticedAt: now,
        };

        if (expectedUci && uci !== expectedUci) {
          setFeedback('Not the expected follow-up move.');
          persist(updatedBase, true);
          return false;
        }

        const applied = makeMove(from, to, promotion);
        if (!applied) {
          return false;
        }

        completeDeviation({
          ...updatedBase,
          moveCorrect: progress.moveCorrect + 1,
          status: nextOutOfBookStatusAfterSuccess(progress.status),
        });
        return true;
      }

      const isAcceptable = selectedDeviation.acceptableUci.includes(uci);
      const updatedBase: OutOfBookProgress = {
        ...progress,
        moveAttempts: progress.moveAttempts + 1,
        lastPracticedAt: now,
      };

      if (!isAcceptable) {
        setFeedback('Not in the acceptable move set.');
        persist(updatedBase, true);
        return false;
      }

      const applied = makeMove(from, to, promotion);
      if (!applied) {
        return false;
      }

      const updated: OutOfBookProgress = {
        ...updatedBase,
        moveCorrect: progress.moveCorrect + 1,
        status: nextOutOfBookStatusAfterSuccess(progress.status),
      };

      setFeedback(null);

      if (triggersContinuation(selectedDeviation, uci)) {
        const cont = selectedDeviation.optionalContinuation!;
        persist(updated, true);
        autoPlayContinuation(getOpponentAutoPlays(cont), () => {
          setStep('continuation');
        });
        return true;
      }

      completeDeviation(updated);
      return true;
    },
    [
      autoPlayContinuation,
      completeDeviation,
      isAutoPlaying,
      makeMove,
      persist,
      progress,
      selectedDeviation,
      step,
    ],
  );

  const hasContinuation = Boolean(selectedDeviation?.optionalContinuation);

  useEffect(() => {
    const onBeforeUnload = () => flushWrites();
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [flushWrites]);

  useEffect(() => {
    return () => {
      flushWrites();
      if (autoPlayTimerRef.current) {
        clearTimeout(autoPlayTimerRef.current);
      }
      if (clearSelectionStateTimerRef.current) {
        clearTimeout(clearSelectionStateTimerRef.current);
      }
      if (selectDeviationTimerRef.current) {
        clearTimeout(selectDeviationTimerRef.current);
      }
    };
  }, [flushWrites]);

  return {
    deviations: filteredDeviations,
    selectedDeviation,
    selectedDeviationId,
    selectDeviation,
    step,
    feedback,
    selectedPlanId,
    choosePlan,
    progress,
    fen,
    draggableSquares,
    handleMove,
    orientation: selectedDeviation?.color ?? 'white',
    isBoardLocked: (step !== 'move' && step !== 'continuation') || isAutoPlaying,
    isAutoPlaying,
    hasContinuation,
    dataError,
  };
}
