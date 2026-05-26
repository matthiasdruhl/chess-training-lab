import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { ENGINE_SKILL_MAX } from '../constants/engine';
import { defaultMovetimeLimits } from '../services/engine/limits';
import { EngineQueue } from '../services/engine/queue';
import type {
  AnalysisResult,
  EngineStatus,
  GoLimits,
  WorkerIn,
  WorkerOut,
} from '../types/engine';

const EVAL_UPDATE_MS = 100;

interface EngineControlValue {
  engineStatus: EngineStatus;
  engineError: string | null;
  enqueueAnalyze: (fen: string, limits?: GoLimits) => Promise<AnalysisResult>;
  enqueueBestMove: (fen: string, limits?: GoLimits) => Promise<string>;
  setEngineOption: (name: string, value: string | number | boolean) => void;
  applySkillLevel: (skillLevel: number) => void;
  resetEngineSkill: () => void;
  restartEngine: () => void;
}

interface EngineEvalValue {
  lastEval: AnalysisResult | null;
}

const EngineControlContext = createContext<EngineControlValue | null>(null);
const EngineEvalContext = createContext<EngineEvalValue | null>(null);

export function EngineProvider({ children }: { children: ReactNode }) {
  const [engineStatus, setEngineStatus] = useState<EngineStatus>('idle');
  const [lastEval, setLastEval] = useState<AnalysisResult | null>(null);
  const [engineError, setEngineError] = useState<string | null>(null);

  const workerRef = useRef<Worker | null>(null);
  const queueRef = useRef<EngineQueue | null>(null);
  const initSentRef = useRef(false);
  const evalPendingRef = useRef<Omit<AnalysisResult, 'bestMoveUci'> | null>(null);
  const evalTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastEvalFlushRef = useRef(0);

  const flushEvalUpdate = useCallback((bestMoveUci = '') => {
    const pending = evalPendingRef.current;
    if (!pending) {
      return;
    }
    evalPendingRef.current = null;
    setLastEval((prev) => ({
      scoreCp: pending.scoreCp,
      depth: pending.depth,
      pv: pending.pv,
      bestMoveUci: bestMoveUci || prev?.bestMoveUci || '',
    }));
  }, []);

  const scheduleEvalUpdate = useCallback(
    (info: { depth: number; scoreCp: number; pv: string[] }) => {
      evalPendingRef.current = info;

      const now = Date.now();
      const elapsed = now - lastEvalFlushRef.current;
      if (elapsed >= EVAL_UPDATE_MS) {
        lastEvalFlushRef.current = now;
        flushEvalUpdate();
        return;
      }

      if (evalTimerRef.current) {
        return;
      }

      evalTimerRef.current = setTimeout(() => {
        evalTimerRef.current = null;
        lastEvalFlushRef.current = Date.now();
        flushEvalUpdate();
      }, EVAL_UPDATE_MS - elapsed);
    },
    [flushEvalUpdate],
  );

  const clearEvalSchedule = useCallback(() => {
    if (evalTimerRef.current) {
      clearTimeout(evalTimerRef.current);
      evalTimerRef.current = null;
    }
    evalPendingRef.current = null;
  }, []);

  const attachQueue = useCallback(
    (worker: Worker) => {
      queueRef.current?.destroy();
      queueRef.current = new EngineQueue(worker, {
        onInfo: (info) => {
          scheduleEvalUpdate(info);
        },
        onThinkingChange: (thinking) => {
          setEngineStatus(thinking ? 'thinking' : 'ready');
        },
        onError: (message) => {
          setEngineError(message);
          setEngineStatus('error');
        },
      });
    },
    [scheduleEvalUpdate],
  );

  const initWorker = useCallback(() => {
    initSentRef.current = false;
    clearEvalSchedule();
    queueRef.current?.destroy();
    queueRef.current = null;

    workerRef.current?.terminate();

    const worker = new Worker(
      new URL('../workers/stockfish.worker.ts', import.meta.url),
      { type: 'module' },
    );
    workerRef.current = worker;
    attachQueue(worker);

    const handleReady = (event: MessageEvent<WorkerOut>) => {
      if (event.data.type === 'ready') {
        initSentRef.current = true;
        setEngineError(null);
        setEngineStatus('ready');
        worker.removeEventListener('message', handleReady);
      }
      if (event.data.type === 'error') {
        setEngineError(event.data.message);
        setEngineStatus('error');
        worker.removeEventListener('message', handleReady);
      }
    };

    worker.addEventListener('message', handleReady);
    worker.addEventListener('error', () => {
      initSentRef.current = false;
      setEngineStatus('error');
      queueRef.current?.cancelCurrent();
      queueRef.current?.clearPending();
    });

    setEngineStatus('idle');
    worker.postMessage({ type: 'init' } satisfies WorkerIn);
  }, [attachQueue, clearEvalSchedule]);

  useEffect(() => {
    initWorker();
    return () => {
      clearEvalSchedule();
      queueRef.current?.destroy();
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, [initWorker, clearEvalSchedule]);

  const restartEngine = useCallback(() => {
    clearEvalSchedule();
    setLastEval(null);
    setEngineError(null);
    initWorker();
  }, [initWorker, clearEvalSchedule]);

  const enqueueAnalyze = useCallback(
    async (fen: string, limits: GoLimits = defaultMovetimeLimits()) => {
      const queue = queueRef.current;
      if (!queue || !initSentRef.current) {
        throw new Error('Engine is not ready.');
      }
      const result = await queue.enqueueAnalyze(fen, limits);
      clearEvalSchedule();
      lastEvalFlushRef.current = Date.now();
      setLastEval(result);
      return result;
    },
    [clearEvalSchedule],
  );

  const enqueueBestMove = useCallback(
    async (fen: string, limits: GoLimits = defaultMovetimeLimits()) => {
      const queue = queueRef.current;
      if (!queue || !initSentRef.current) {
        throw new Error('Engine is not ready.');
      }
      return queue.enqueueBestMove(fen, limits);
    },
    [],
  );

  const setEngineOption = useCallback((name: string, value: string | number | boolean) => {
    const worker = workerRef.current;
    if (!worker || !initSentRef.current) {
      return;
    }
    worker.postMessage({ type: 'setoption', name, value } satisfies WorkerIn);
  }, []);

  const applySkillLevel = useCallback(
    (skillLevel: number) => {
      const clamped = Math.max(0, Math.min(ENGINE_SKILL_MAX, skillLevel));
      setEngineOption('Skill Level', clamped);
      setEngineOption('UCI_LimitStrength', clamped < ENGINE_SKILL_MAX);
    },
    [setEngineOption],
  );

  const resetEngineSkill = useCallback(() => {
    applySkillLevel(ENGINE_SKILL_MAX);
  }, [applySkillLevel]);

  const controlValue = useMemo(
    () => ({
      engineStatus,
      engineError,
      enqueueAnalyze,
      enqueueBestMove,
      setEngineOption,
      applySkillLevel,
      resetEngineSkill,
      restartEngine,
    }),
    [
      engineStatus,
      engineError,
      enqueueAnalyze,
      enqueueBestMove,
      setEngineOption,
      applySkillLevel,
      resetEngineSkill,
      restartEngine,
    ],
  );

  const evalValue = useMemo(() => ({ lastEval }), [lastEval]);

  return (
    <EngineControlContext.Provider value={controlValue}>
      <EngineEvalContext.Provider value={evalValue}>{children}</EngineEvalContext.Provider>
    </EngineControlContext.Provider>
  );
}

export function useEngineControl(): EngineControlValue {
  const ctx = useContext(EngineControlContext);
  if (!ctx) {
    throw new Error('useEngineControl must be used within EngineProvider');
  }
  return ctx;
}

export function useEngineEval(): EngineEvalValue {
  const ctx = useContext(EngineEvalContext);
  if (!ctx) {
    throw new Error('useEngineEval must be used within EngineProvider');
  }
  return ctx;
}

/** Full engine context — prefer useEngineControl in layout chrome to avoid eval rerenders. */
export function useEngineContext(): EngineControlValue & EngineEvalValue {
  return { ...useEngineControl(), ...useEngineEval() };
}
