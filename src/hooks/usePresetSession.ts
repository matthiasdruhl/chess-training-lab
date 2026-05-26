import { Chess, type Square } from 'chess.js';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ENDGAME_RESET_ON_DRAW, QUIZ_MOVE_LOSS_CP } from '../constants/analysis';
import { OPPONENT_REPLY_DELAY_MS } from '../constants/engine';
import { DEBOUNCE_WRITE_MS } from '../constants/persistence';
import { TOAST_DURATION_MS } from '../constants/training';
import {
  filterPresetsByModule,
  filterPresetsByOpeningFamily,
  listPresets,
} from '../services/presets/loadPresets';
import type { GoLimits } from '../types/engine';
import type { DrillStats, OpeningFamily, Preset } from '../types/preset';
import {
  createDefaultDrillStats,
  getDrillStats,
  putDrillStats,
} from '../storage/drillStatsRepo';
import { useChessSession } from './useChessSession';
import { useStockfish } from './useStockfish';

export type PresetFamilyFilter = OpeningFamily | 'all';

function moveToUci(from: Square, to: Square, promotion?: 'q' | 'r' | 'b' | 'n'): string {
  return `${from}${to}${promotion ?? ''}`;
}

function userColorChar(preset: Preset): 'w' | 'b' {
  return preset.sideToTrain === 'white' ? 'w' : 'b';
}

function normalizeToUserPov(
  scoreCp: number,
  sideToMove: 'w' | 'b',
  userColor: 'w' | 'b',
): number {
  return sideToMove === userColor ? scoreCp : -scoreCp;
}

function presetGoLimits(preset: Preset): GoLimits {
  if (preset.stockfish.depth != null) {
    return { depth: preset.stockfish.depth };
  }
  return { movetime: preset.stockfish.movetimeMs };
}

function resetOnDrawEnabled(preset: Preset): boolean {
  return preset.sessionDefaults.resetOnDraw ?? ENDGAME_RESET_ON_DRAW;
}

function isDrawOrStalemate(fen: string): boolean {
  try {
    const chess = new Chess(fen);
    return chess.isDraw() || chess.isStalemate();
  } catch {
    return false;
  }
}

function isUserCheckmated(fen: string, userColor: 'w' | 'b'): boolean {
  try {
    const chess = new Chess(fen);
    return chess.isCheckmate() && chess.turn() === userColor;
  } catch {
    return false;
  }
}

export function usePresetSession(
  module: 'middlegame' | 'endgame',
  presetIdFromQuery: string | null,
  familyFilter: PresetFamilyFilter = 'all',
) {
  const allPresets = useMemo(() => filterPresetsByModule(listPresets(), module), [module]);

  const filteredPresets = useMemo(
    () => filterPresetsByOpeningFamily(allPresets, familyFilter),
    [allPresets, familyFilter],
  );

  const presetExistsInModule =
    presetIdFromQuery != null ? allPresets.some((preset) => preset.id === presetIdFromQuery) : true;

  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(() => {
    if (presetIdFromQuery != null) {
      return presetExistsInModule ? presetIdFromQuery : null;
    }
    return filteredPresets[0]?.id ?? null;
  });

  const selectedPreset: Preset | undefined = useMemo(
    () => allPresets.find((preset) => preset.id === selectedPresetId),
    [allPresets, selectedPresetId],
  );

  const pickerPresets = useMemo(() => {
    if (!selectedPreset) {
      return filteredPresets;
    }
    if (filteredPresets.some((preset) => preset.id === selectedPreset.id)) {
      return filteredPresets;
    }
    // Ensure query-driven selection still appears in the picker when filtered out.
    return [selectedPreset, ...filteredPresets];
  }, [filteredPresets, selectedPreset]);

  const { fen, turn, history, isGameOver, loadFen, makeMove, applyUciMove } = useChessSession(
    selectedPreset?.fen,
  );

  const {
    analyze,
    bestMove,
    lastEval,
    isThinking,
    isReady,
    applySkillLevel,
    resetEngineSkill,
    restartEngine,
  } = useStockfish();

  const [stats, setStats] = useState<DrillStats | null>(null);
  const [sessionMoveCount, setSessionMoveCount] = useState(0);
  const [sessionResetCount, setSessionResetCount] = useState(0);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [showResetToast, setShowResetToast] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [sessionMessage, setSessionMessage] = useState<string | null>(() => {
    if (presetIdFromQuery != null && !presetExistsInModule) {
      return `Invalid preset id: ${presetIdFromQuery}`;
    }
    return null;
  });

  const pendingWriteRef = useRef<DrillStats | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const processingRef = useRef(false);
  const resetToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const presetRef = useRef<Preset | undefined>(selectedPreset);
  const sessionMoveCountRef = useRef(0);
  const statsRef = useRef<DrillStats | null>(null);
  const completionRecordedRef = useRef(false);
  const appliedSkillLevelRef = useRef<number | null>(null);

  const flushWrites = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    if (pendingWriteRef.current) {
      const record = pendingWriteRef.current;
      pendingWriteRef.current = null;
      void putDrillStats(record);
    }
  }, []);

  const persist = useCallback((record: DrillStats, immediate = false) => {
    setStats(record);
    statsRef.current = record;
    pendingWriteRef.current = record;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    if (immediate) {
      pendingWriteRef.current = null;
      void putDrillStats(record);
      return;
    }

    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      const toWrite = pendingWriteRef.current;
      pendingWriteRef.current = null;
      if (toWrite) {
        void putDrillStats(toWrite);
      }
    }, DEBOUNCE_WRITE_MS);
  }, []);

  const ensurePresetSkillLevel = useCallback(
    (preset: Preset) => {
      const skillLevel = preset.stockfish.skillLevel;
      if (appliedSkillLevelRef.current === skillLevel) {
        return;
      }
      applySkillLevel(skillLevel);
      appliedSkillLevelRef.current = skillLevel;
    },
    [applySkillLevel],
  );

  const refreshEval = useCallback(
    async (positionFen: string) => {
      const preset = presetRef.current;
      if (!preset || !isReady) {
        return;
      }
      try {
        await analyze(positionFen, presetGoLimits(preset));
      } catch {
        // Eval bar is best-effort during play.
      }
    },
    [analyze, isReady],
  );

  const triggerResetToast = useCallback(() => {
    setShowResetToast(true);
    if (resetToastTimerRef.current) {
      clearTimeout(resetToastTimerRef.current);
    }
    resetToastTimerRef.current = setTimeout(() => {
      setShowResetToast(false);
      resetToastTimerRef.current = null;
    }, TOAST_DURATION_MS);
  }, []);

  const resetToPreset = useCallback(
    (reason: 'mistake' | 'draw') => {
      const preset = presetRef.current;
      if (!preset) {
        return;
      }

      loadFen(preset.fen);
      setSessionResetCount((count) => count + 1);
      triggerResetToast();

      setStats((current) => {
        if (!current) {
          return current;
        }
        const updated: DrillStats = {
          ...current,
          resetCount: current.resetCount + 1,
          lastPlayedAt: new Date().toISOString(),
        };
        persist(updated, true);
        return updated;
      });

      if (reason === 'draw') {
        setSessionMessage('Draw — position reset. Find the winning technique.');
      } else {
        setSessionMessage('Imprecise — position reset. Find the precise move.');
      }

      void refreshEval(preset.fen);
    },
    [loadFen, persist, refreshEval, triggerResetToast],
  );

  const playEngineReply = useCallback(
    async (positionFen: string): Promise<string | null> => {
      const preset = presetRef.current;
      if (!preset || !isReady) {
        return null;
      }

      ensurePresetSkillLevel(preset);

      try {
        const bestMoveWithTimeout = async (fenToSearch: string, timeoutMs: number): Promise<string> => {
          return await Promise.race([
            bestMove(fenToSearch, presetGoLimits(preset)),
            new Promise<string>((_, reject) => {
              setTimeout(() => reject(new Error('Engine reply timed out.')), timeoutMs);
            }),
          ]);
        };

        const restartThenRetry = async (reason: string) => {
          setSessionMessage(`Engine error — resetting. ${reason}`);
          restartEngine();
          await new Promise<void>((resolve) => {
            setTimeout(() => resolve(), OPPONENT_REPLY_DELAY_MS);
          });
        };

        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            const uci = await bestMoveWithTimeout(positionFen, OPPONENT_REPLY_DELAY_MS * 4);
            await new Promise<void>((resolve) => {
              setTimeout(() => resolve(), OPPONENT_REPLY_DELAY_MS);
            });

            const chess = new Chess(positionFen);
            const from = uci.slice(0, 2) as Square;
            const to = uci.slice(2, 4) as Square;
            const promo = uci[4];
            const promotion =
              promo === 'q' || promo === 'r' || promo === 'b' || promo === 'n'
                ? promo
                : undefined;

            // chess.js returns null when the move is illegal; treat that as a failure.
            const localMove = chess.move({ from, to, promotion: promotion ?? 'q' });
            const applied = applyUciMove(uci);
            if (!localMove || !applied) {
              throw new Error('Engine reply was not applicable.');
            }

            return chess.fen();
          } catch (err) {
            if (attempt === 0) {
              await restartThenRetry(
                err instanceof Error ? err.message : 'Retrying engine reply...',
              );
              continue;
            }
            setSessionMessage('Engine move failed — board unlocked. Try your move again.');
            restartEngine();
            return null;
          }
        }
        return null;
      } catch {
        setSessionMessage('Engine move failed — board unlocked. Try your move again.');
        restartEngine();
        return null;
      }
    },
    [applyUciMove, bestMove, ensurePresetSkillLevel, isReady, restartEngine],
  );

  const gradeUserMove = useCallback(
    async (fenBefore: string, userUci: string): Promise<boolean> => {
      const preset = presetRef.current;
      if (!preset?.sessionDefaults.resetOnMistake) {
        return true;
      }

      try {
        const beforeAnalysis = await analyze(fenBefore, presetGoLimits(preset));
        if (beforeAnalysis.bestMoveUci && userUci === beforeAnalysis.bestMoveUci) {
          return true;
        }

        const chess = new Chess(fenBefore);
        const from = userUci.slice(0, 2) as Square;
        const to = userUci.slice(2, 4) as Square;
        const promo = userUci[4];
        const promotion =
          promo === 'q' || promo === 'r' || promo === 'b' || promo === 'n' ? promo : undefined;
        chess.move({ from, to, promotion: promotion ?? 'q' });
        const fenAfter = chess.fen();

        const afterAnalysis = await analyze(fenAfter, presetGoLimits(preset));
        const userColor = userColorChar(preset);
        const evalBefore = normalizeToUserPov(beforeAnalysis.scoreCp, userColor, userColor);
        const evalAfter = normalizeToUserPov(afterAnalysis.scoreCp, chess.turn(), userColor);
        if (!Number.isFinite(evalBefore) || !Number.isFinite(evalAfter)) {
          resetToPreset('mistake');
          return false;
        }
        const lossCp = evalBefore - evalAfter;

        if (lossCp >= QUIZ_MOVE_LOSS_CP) {
          resetToPreset('mistake');
          return false;
        }
      } catch {
        // In strict mode we still have to enforce resets even when analysis fails.
        resetToPreset('mistake');
        return false;
      }

      return true;
    },
    [analyze, resetToPreset],
  );

  const recordAcceptedMove = useCallback(
    (nextMoveCount: number) => {
      const now = new Date().toISOString();
      sessionMoveCountRef.current = nextMoveCount;
      setSessionMoveCount(nextMoveCount);
      setStats((current) => {
        if (!current) {
          return current;
        }
        const updated: DrillStats = {
          ...current,
          totalMoves: current.totalMoves + 1,
          lastPlayedAt: now,
        };
        persist(updated);
        return updated;
      });
    },
    [persist],
  );

  const processAfterUserMove = useCallback(
    async (userUci: string, fenBefore: string) => {
      if (processingRef.current) {
        return;
      }

      processingRef.current = true;
      setIsProcessing(true);

      try {
        const preset = presetRef.current;
        if (!preset) {
          return;
        }

        setSessionMessage(null);

        const userColor = userColorChar(preset);
        let currentFen: string;

        const chess = new Chess(fenBefore);
        const from = userUci.slice(0, 2) as Square;
        const to = userUci.slice(2, 4) as Square;
        const promo = userUci[4];
        const promotion =
          promo === 'q' || promo === 'r' || promo === 'b' || promo === 'n' ? promo : undefined;
        chess.move({ from, to, promotion: promotion ?? 'q' });
        currentFen = chess.fen();

        if (isDrawOrStalemate(currentFen)) {
          if (resetOnDrawEnabled(preset)) {
            resetToPreset('draw');
          } else {
            setSessionMessage('Game drawn.');
            void refreshEval(currentFen);
          }
          return;
        }

        if (isUserCheckmated(currentFen, userColor)) {
          if (preset.sessionDefaults.resetOnMistake) {
            resetToPreset('mistake');
          } else {
            setSessionMessage('Checkmated.');
            void refreshEval(currentFen);
          }
          return;
        }

        const moveOk = await gradeUserMove(fenBefore, userUci);
        if (!moveOk) {
          return;
        }

        const nextMoveCount = sessionMoveCountRef.current + 1;
        recordAcceptedMove(nextMoveCount);

        const maxMoves = preset.sessionDefaults.maxMoves;
        if (maxMoves !== undefined && nextMoveCount >= maxMoves) {
          setSessionComplete(true);
          setSessionMessage(`Session limit reached (${maxMoves} moves).`);
          setStats((current) => {
            if (!current) {
              return current;
            }
            const updated: DrillStats = {
              ...current,
              bestSessionMoves: Math.max(current.bestSessionMoves ?? 0, nextMoveCount),
              completions: current.completions + 1,
              lastPlayedAt: new Date().toISOString(),
            };
            persist(updated, true);
            return updated;
          });
          // Prevent completion increments on resign/unmount after limit completion.
          completionRecordedRef.current = true;
          void refreshEval(currentFen);
          return;
        }

        const chessAfterUser = new Chess(currentFen);
        if (!chessAfterUser.isGameOver() && chessAfterUser.turn() !== userColor) {
          const afterReply = await playEngineReply(currentFen);
          if (afterReply) {
            currentFen = afterReply;
          }
        }

        void refreshEval(currentFen);
      } catch {
        // Hard safety net: never leave the board locked on unexpected failures.
        setSessionMessage('Unexpected processing error — board unlocked.');
      } finally {
        processingRef.current = false;
        setIsProcessing(false);
      }
    },
    [gradeUserMove, persist, playEngineReply, recordAcceptedMove, refreshEval, resetToPreset],
  );

  const flushOutgoingPresetSession = useCallback(
    async (outgoingPresetId: string, moveCount: number) => {
      if (moveCount <= 0) {
        return;
      }

      const existing = await getDrillStats(outgoingPresetId);
      if (!existing) {
        return;
      }

      const updated: DrillStats = {
        ...existing,
        bestSessionMoves: Math.max(existing.bestSessionMoves ?? 0, moveCount),
        lastPlayedAt: new Date().toISOString(),
      };
      await putDrillStats(updated);
    },
    [],
  );

  const loadPresetSession = useCallback(
    async (presetId: string) => {
      flushWrites();
      if (resetToastTimerRef.current) {
        clearTimeout(resetToastTimerRef.current);
        resetToastTimerRef.current = null;
      }

      const outgoingPresetId = presetRef.current?.id;
      const outgoingMoveCount = sessionMoveCountRef.current;
      if (outgoingPresetId && outgoingPresetId !== presetId) {
        await flushOutgoingPresetSession(outgoingPresetId, outgoingMoveCount);
      }

      const preset = allPresets.find((item) => item.id === presetId);
      if (!preset) {
        setSessionMessage(`Invalid preset id: ${presetId}`);
        setSelectedPresetId(null);
        return;
      }

      // Ensure all ref-based callbacks use the newly loaded preset.
      presetRef.current = preset;
      sessionMoveCountRef.current = 0;

      processingRef.current = false;
      setIsProcessing(false);
      setSessionMoveCount(0);
      setSessionResetCount(0);
      setSessionComplete(false);
      setShowResetToast(false);
      setSessionMessage(null);
      completionRecordedRef.current = false;
      loadFen(preset.fen);

      const existing = await getDrillStats(presetId);
      const now = new Date().toISOString();
      const record: DrillStats = {
        ...(existing ?? createDefaultDrillStats(presetId, module)),
        // Every session load counts as a new attempt.
        attempts: (existing?.attempts ?? 0) + 1,
        lastPlayedAt: now,
      };
      setStats(record);
      persist(record, true);

      if (isReady) {
        ensurePresetSkillLevel(preset);
      }

      void refreshEval(preset.fen);
    },
    [
      ensurePresetSkillLevel,
      allPresets,
      flushOutgoingPresetSession,
      flushWrites,
      isReady,
      loadFen,
      module,
      persist,
      refreshEval,
    ],
  );

  const recordCompletion = useCallback(() => {
    if (completionRecordedRef.current) {
      return;
    }

    const currentStats = statsRef.current;
    if (!currentStats) {
      return;
    }

    completionRecordedRef.current = true;
    const updated: DrillStats = {
      ...currentStats,
      completions: currentStats.completions + 1,
      bestSessionMoves: Math.max(currentStats.bestSessionMoves ?? 0, sessionMoveCountRef.current),
      lastPlayedAt: new Date().toISOString(),
    };
    persist(updated, true);
  }, [persist]);

  const selectPreset = useCallback((presetId: string) => {
    setSessionMessage(null);
    setSelectedPresetId(presetId);
  }, []);

  const endSession = useCallback(() => {
    if (sessionComplete) {
      recordCompletion();
    } else {
      flushWrites();
    }
    setSessionMessage('Session saved.');
  }, [flushWrites, recordCompletion, sessionComplete]);

  const handleMove = useCallback(
    (from: Square, to: Square, promotion?: 'q' | 'r' | 'b' | 'n'): boolean => {
      const preset = presetRef.current;
      if (
        !preset ||
        sessionComplete ||
        processingRef.current ||
        isProcessing ||
        isThinking ||
        !isReady
      ) {
        return false;
      }

      const userColor = userColorChar(preset);
      if (turn !== userColor) {
        return false;
      }

      const fenBefore = fen;
      const uci = moveToUci(from, to, promotion);
      const applied = makeMove(from, to, promotion);
      if (!applied) {
        return false;
      }

      void processAfterUserMove(uci, fenBefore);
      return true;
    },
    [fen, isProcessing, isReady, isThinking, makeMove, processAfterUserMove, sessionComplete, turn],
  );

  useEffect(() => {
    if (!selectedPresetId) {
      return;
    }
    const id = selectedPresetId;
    // Avoid "setState in effect" lint by scheduling after paint.
    queueMicrotask(() => {
      void loadPresetSession(id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPresetId]);

  useEffect(() => {
    if (!selectedPreset || !isReady) {
      return;
    }
    ensurePresetSkillLevel(selectedPreset);
  }, [ensurePresetSkillLevel, isReady, selectedPreset]);

  useEffect(() => {
    const onBeforeUnload = () => flushWrites();
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [flushWrites]);

  useEffect(() => {
    return () => {
      if (sessionComplete && sessionMoveCountRef.current > 0 && !completionRecordedRef.current) {
        recordCompletion();
      } else {
        flushWrites();
      }
      resetEngineSkill();
      appliedSkillLevelRef.current = null;
      if (resetToastTimerRef.current) {
        clearTimeout(resetToastTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isBoardLocked =
    !selectedPreset ||
    !isReady ||
    sessionComplete ||
    isProcessing ||
    isThinking ||
    turn !== (selectedPreset ? userColorChar(selectedPreset) : 'w') ||
    isGameOver;

  return {
    presets: pickerPresets,
    selectedPreset,
    selectedPresetId,
    selectPreset,
    fen,
    turn,
    history,
    stats,
    sessionMoveCount,
    sessionResetCount,
    sessionComplete,
    showResetToast,
    sessionMessage,
    handleMove,
    endSession,
    orientation: selectedPreset?.sideToTrain ?? 'white',
    isBoardLocked,
    isProcessing: isProcessing || isThinking,
    lastEval,
    familyFilter,
  };
}
