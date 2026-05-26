import { useAppContext } from '../context/AppContext';
import { useEngineControl, useEngineEval } from '../context/EngineContext';
import { DEFAULT_MOVETIME_MS } from '../constants/engine';
import { defaultMovetimeLimits } from '../services/engine/limits';
import type { AnalysisResult, GoLimits } from '../types/engine';

export function useStockfish() {
  const { settings } = useAppContext();
  const {
    engineStatus,
    engineError,
    enqueueAnalyze,
    enqueueBestMove,
    applySkillLevel,
    resetEngineSkill,
    restartEngine,
  } = useEngineControl();
  const { lastEval } = useEngineEval();

  const defaultLimits = (): GoLimits =>
    defaultMovetimeLimits(
      settings.engine.defaultMovetimeMs ?? DEFAULT_MOVETIME_MS,
    );

  const analyze = (fen: string, limits?: GoLimits): Promise<AnalysisResult> =>
    enqueueAnalyze(fen, limits ?? defaultLimits());

  const bestMove = (fen: string, limits?: GoLimits): Promise<string> =>
    enqueueBestMove(fen, limits ?? defaultLimits());

  return {
    engineStatus,
    lastEval,
    engineError,
    analyze,
    bestMove,
    applySkillLevel,
    resetEngineSkill,
    restartEngine,
    isThinking: engineStatus === 'thinking',
    isReady: engineStatus === 'ready',
  };
}

/** Status-only hook for layout chrome — avoids rerenders on eval ticks. */
export function useEngineStatus() {
  const { engineStatus, engineError, restartEngine } = useEngineControl();
  return {
    engineStatus,
    engineError,
    restartEngine,
    isThinking: engineStatus === 'thinking',
    isReady: engineStatus === 'ready',
  };
}
