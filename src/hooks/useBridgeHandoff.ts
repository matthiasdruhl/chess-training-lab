import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DEBOUNCE_WRITE_MS } from '../constants/persistence';
import { listHandoffs } from '../services/bridge/loadHandoffs';
import type { BridgeHandoff, BridgeProgress } from '../types/bridge';
import { createDefaultBridgeProgress, getBridgeProgress, putBridgeProgress } from '../storage/bridgeRepo';
import { useChessSession } from './useChessSession';

export function useBridgeHandoff(handoffIdFromQuery: string | null, nodeIdFromQuery: string | null) {
  const navigate = useNavigate();
  const handoffs = useMemo(() => listHandoffs(), []);

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
      const handoff = filteredHandoffs.find((h) => h.id === handoffId);
      if (!handoff) {
        return;
      }

      setSelectedHandoffId(handoffId);
      setFeedback(null);
      setSelectedPlanId(null);
      loadFen(handoff.handoffFen);

      const existing = await getBridgeProgress(handoffId);
      const record = existing ?? createDefaultBridgeProgress(handoffId, handoff.repertoireNodeId);
      setProgress(record);

      if (record.planQuizPassed) {
        setPassed(true);
        setSelectedPlanId(handoff.correctPlanId);
      } else {
        setPassed(false);
      }
    },
    [filteredHandoffs, flushWrites, loadFen],
  );

  useEffect(() => {
    const targetId = resolveHandoffId();
    if (targetId && targetId !== selectedHandoffId) {
      setSelectedHandoffId(targetId);
    }
  }, [resolveHandoffId, selectedHandoffId]);

  useEffect(() => {
    if (!selectedHandoffId) {
      return;
    }
    void selectHandoff(selectedHandoffId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedHandoffId]);

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
  };
}
