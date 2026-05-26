import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DEBOUNCE_WRITE_MS } from '../constants/persistence';
import { getHandoffValidationError, listHandoffs } from '../services/bridge/loadHandoffs';
import type { BridgeHandoff, BridgeProgress } from '../types/bridge';
import { createDefaultBridgeProgress, getBridgeProgress, putBridgeProgress } from '../storage/bridgeRepo';
import { useChessSession } from './useChessSession';

export function useBridgeHandoff(handoffIdFromQuery: string | null, nodeIdFromQuery: string | null) {
  const navigate = useNavigate();
  const { handoffs, dataError } = useMemo(() => {
    try {
      return {
        handoffs: listHandoffs(),
        dataError: getHandoffValidationError(),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load bridge handoffs.';
      return { handoffs: [] as BridgeHandoff[], dataError: message };
    }
  }, []);

  const filteredHandoffs = useMemo(() => {
    if (!nodeIdFromQuery) {
      return handoffs;
    }
    return handoffs.filter((handoff) => handoff.repertoireNodeId === nodeIdFromQuery);
  }, [handoffs, nodeIdFromQuery]);

  const resolveHandoffId = useCallback(
    () => {
      if (handoffIdFromQuery && filteredHandoffs.some((h) => h.id === handoffIdFromQuery)) {
        return handoffIdFromQuery;
      }
      return filteredHandoffs[0]?.id ?? null;
    },
    [handoffIdFromQuery, filteredHandoffs],
  );

  const [selectedHandoffId, setSelectedHandoffId] = useState<string | null>(resolveHandoffId);

  const selectedHandoff: BridgeHandoff | undefined = useMemo(
    () => filteredHandoffs.find((h) => h.id === selectedHandoffId),
    [filteredHandoffs, selectedHandoffId],
  );

  const { fen, loadFen } = useChessSession(selectedHandoff?.handoffFen);

  const [feedback, setFeedback] = useState<string | null>(null);
  const [passed, setPassed] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [progress, setProgress] = useState<BridgeProgress | null>(null);

  const pendingWriteRef = useRef<BridgeProgress | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectionRequestIdRef = useRef(0);
  const clearSelectionStateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectHandoffTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearSelectionState = useCallback(() => {
    selectionRequestIdRef.current += 1;
    setSelectedHandoffId(null);
    setFeedback(null);
    setSelectedPlanId(null);
    setPassed(false);
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
      void putBridgeProgress(record);
    }
  }, []);

  const persist = useCallback((record: BridgeProgress, immediate = false) => {
    setProgress(record);
    pendingWriteRef.current = record;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    if (immediate) {
      pendingWriteRef.current = null;
      void putBridgeProgress(record);
      return;
    }

    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      const toWrite = pendingWriteRef.current;
      pendingWriteRef.current = null;
      if (toWrite) {
        void putBridgeProgress(toWrite);
      }
    }, DEBOUNCE_WRITE_MS);
  }, []);

  const selectHandoff = useCallback(
    async (handoffId: string) => {
      flushWrites();
      const requestId = selectionRequestIdRef.current + 1;
      selectionRequestIdRef.current = requestId;

      const handoff = filteredHandoffs.find((h) => h.id === handoffId);
      if (!handoff) {
        clearSelectionState();
        return;
      }

      setSelectedHandoffId(handoffId);
      setFeedback(null);
      setSelectedPlanId(null);
      loadFen(handoff.handoffFen);

      const existing = await getBridgeProgress(handoffId);
      const record = existing ?? createDefaultBridgeProgress(handoffId, handoff.repertoireNodeId);

       if (selectionRequestIdRef.current !== requestId) {
        return;
      }
      setProgress(record);

      if (record.planQuizPassed) {
        setPassed(true);
        setSelectedPlanId(handoff.correctPlanId);
      } else {
        setPassed(false);
      }
    },
    [clearSelectionState, filteredHandoffs, flushWrites, loadFen],
  );
  const scheduleSelectHandoff = useCallback(
    (handoffId: string) => {
      if (selectHandoffTimerRef.current) {
        clearTimeout(selectHandoffTimerRef.current);
      }
      selectHandoffTimerRef.current = setTimeout(() => {
        selectHandoffTimerRef.current = null;
        void selectHandoff(handoffId);
      }, 0);
    },
    [selectHandoff],
  );

  useEffect(() => {
    const targetId = resolveHandoffId();
    if (!targetId) {
      flushWrites();
      if (
        selectedHandoffId !== null ||
        progress !== null ||
        passed ||
        selectedPlanId !== null ||
        feedback !== null
      ) {
        scheduleClearSelectionState();
      }
      return;
    }

    if (targetId !== selectedHandoffId) {
      scheduleSelectHandoff(targetId);
    }
  }, [
    clearSelectionState,
    feedback,
    flushWrites,
    passed,
    progress,
    resolveHandoffId,
    scheduleClearSelectionState,
    scheduleSelectHandoff,
    selectedHandoffId,
    selectedPlanId,
  ]);

  const choosePlan = useCallback(
    (planId: string) => {
      if (!selectedHandoff || !progress || passed) {
        return;
      }

      const now = new Date().toISOString();
      const updatedBase: BridgeProgress = {
        ...progress,
        planQuizAttempts: progress.planQuizAttempts + 1,
        lastPracticedAt: now,
      };

      setSelectedPlanId(planId);

      if (planId !== selectedHandoff.correctPlanId) {
        setFeedback('Not the main plan here.');
        persist(updatedBase, true);
        return;
      }

      setFeedback(null);
      setPassed(true);
      persist(
        {
          ...updatedBase,
          planQuizPassed: true,
        },
        true,
      );
    },
    [passed, persist, progress, selectedHandoff],
  );

  const continueToMiddlegame = useCallback(() => {
    if (!selectedHandoff || !progress || !passed) {
      return;
    }

    const updated: BridgeProgress = {
      ...progress,
      continuedToMiddlegame: true,
      lastPracticedAt: new Date().toISOString(),
    };
    persist(updated, true);
    navigate(`/middlegame?preset=${encodeURIComponent(selectedHandoff.linkedPresetId)}`);
  }, [navigate, passed, persist, progress, selectedHandoff]);

  useEffect(() => {
    const onBeforeUnload = () => flushWrites();
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [flushWrites]);

  useEffect(() => {
    return () => {
      flushWrites();
      if (clearSelectionStateTimerRef.current) {
        clearTimeout(clearSelectionStateTimerRef.current);
      }
      if (selectHandoffTimerRef.current) {
        clearTimeout(selectHandoffTimerRef.current);
      }
    };
  }, [flushWrites]);

  return {
    handoffs: filteredHandoffs,
    selectedHandoff,
    selectedHandoffId,
    selectHandoff,
    fen,
    passed,
    feedback,
    selectedPlanId,
    choosePlan,
    continueToMiddlegame,
    progress,
    orientation: selectedHandoff?.color ?? 'white',
    dataError,
  };
}
