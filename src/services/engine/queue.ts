import { resolveGoLimits } from './limits';
import { Chess, type Square } from 'chess.js';
import type {
  AnalysisResult,
  GoLimits,
  WorkerIn,
  WorkerOut,
} from '../../types/engine';

const QUEUE_DESTROYED = 'Engine queue destroyed';
const TERMINAL_BESTMOVE = '(none)';
const TERMINAL_POSITION_MESSAGE =
  'Position has no legal moves (checkmate or stalemate).';
const JOB_TIMEOUT_FALLBACK_MS = 15_000;
const JOB_TIMEOUT_BUFFER_MS = 2_000;
const JOB_TIMEOUT_MAX_MS = 60_000;

type AnalyzeJob = {
  kind: 'analyze';
  fen: string;
  limits: GoLimits;
  resolve: (result: AnalysisResult) => void;
  reject: (error: Error) => void;
};

type BestMoveJob = {
  kind: 'bestMove';
  fen: string;
  limits: GoLimits;
  resolve: (uci: string) => void;
  reject: (error: Error) => void;
};

type EngineJob = AnalyzeJob | BestMoveJob;

export interface EngineQueueCallbacks {
  onInfo?: (info: { depth: number; scoreCp: number; pv: string[] }) => void;
  onThinkingChange?: (thinking: boolean) => void;
  onError?: (message: string) => void;
}

export class EngineQueue {
  private readonly queue: EngineJob[] = [];

  private current: EngineJob | null = null;

  private lastInfo: { depth: number; scoreCp: number; pv: string[] } | null =
    null;

  private cancelled = false;

  private destroyed = false;

  private jobTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private worker: Worker,
    private callbacks: EngineQueueCallbacks = {},
  ) {
    worker.addEventListener('message', this.handleMessage);
  }

  destroy(): void {
    if (this.destroyed) {
      return;
    }
    this.destroyed = true;
    this.worker.removeEventListener('message', this.handleMessage);
    this.rejectAll(new Error(QUEUE_DESTROYED));
  }

  clearPending(): void {
    this.rejectQueued(new Error('Engine queue cleared.'));
  }

  cancelCurrent(): void {
    if (this.destroyed) {
      return;
    }

    const job = this.current;
    if (!job) {
      return;
    }

    this.current = null;
    this.cancelled = true;
    this.clearJobTimer();
    job.reject(new Error('Analysis cancelled.'));
    this.callbacks.onThinkingChange?.(false);
    this.worker.postMessage({ type: 'stop' } satisfies WorkerIn);
  }

  enqueueAnalyze(fen: string, limits: GoLimits = {}): Promise<AnalysisResult> {
    return new Promise((resolve, reject) => {
      if (this.destroyed) {
        reject(new Error(QUEUE_DESTROYED));
        return;
      }
      this.queue.push({ kind: 'analyze', fen, limits, resolve, reject });
      void this.pump();
    });
  }

  enqueueBestMove(fen: string, limits: GoLimits = {}): Promise<string> {
    return new Promise((resolve, reject) => {
      if (this.destroyed) {
        reject(new Error(QUEUE_DESTROYED));
        return;
      }
      this.queue.push({ kind: 'bestMove', fen, limits, resolve, reject });
      void this.pump();
    });
  }

  private handleMessage = (event: MessageEvent<WorkerOut>): void => {
    if (this.destroyed) {
      return;
    }

    const msg = event.data;

    switch (msg.type) {
      case 'info':
        this.lastInfo = {
          depth: msg.depth,
          scoreCp: msg.scoreCp,
          pv: msg.pv,
        };
        this.callbacks.onInfo?.(this.lastInfo);
        break;

      case 'bestmove':
        this.finishCurrent(msg.uci);
        break;

      case 'error':
        this.failCurrent(new Error(msg.message));
        this.callbacks.onError?.(msg.message);
        break;

      default:
        break;
    }
  };

  private async pump(): Promise<void> {
    if (this.destroyed || this.current || this.queue.length === 0) {
      return;
    }

    const job = this.queue.shift();
    if (!job) {
      return;
    }

    this.current = job;
    this.lastInfo = null;
    this.cancelled = false;
    this.callbacks.onThinkingChange?.(true);

    this.worker.postMessage({
      type: 'position',
      fen: job.fen,
    } satisfies WorkerIn);

    const limits = resolveGoLimits(job.limits);
    this.worker.postMessage({
      type: 'go',
      ...limits,
    } satisfies WorkerIn);
    this.armJobTimeout(job, limits);
  }

  private finishCurrent(bestMoveUci: string): void {
    if (this.destroyed) {
      return;
    }

    const job = this.current;
    if (!job) {
      return;
    }

    this.clearJobTimer();
    this.current = null;
    this.callbacks.onThinkingChange?.(false);

    if (this.cancelled) {
      this.cancelled = false;
      void this.pump();
      return;
    }

    if (
      bestMoveUci !== TERMINAL_BESTMOVE &&
      !this.isLegalMoveForFen(job.fen, bestMoveUci)
    ) {
      job.reject(
        new Error(`Engine suggested illegal move for position: ${bestMoveUci}`),
      );
      void this.pump();
      return;
    }

    if (job.kind === 'analyze') {
      const info = this.lastInfo;
      job.resolve({
        scoreCp: info?.scoreCp ?? 0,
        depth: info?.depth ?? 0,
        pv: info?.pv ?? [],
        bestMoveUci: bestMoveUci === TERMINAL_BESTMOVE ? '' : bestMoveUci,
      });
    } else if (bestMoveUci === TERMINAL_BESTMOVE) {
      job.reject(new Error(TERMINAL_POSITION_MESSAGE));
    } else {
      job.resolve(bestMoveUci);
    }

    void this.pump();
  }

  private failCurrent(error: Error): void {
    if (this.destroyed) {
      return;
    }

    const job = this.current;
    this.clearJobTimer();
    this.current = null;
    this.callbacks.onThinkingChange?.(false);

    if (job) {
      job.reject(error);
    }

    void this.pump();
  }

  private rejectQueued(error: Error): void {
    while (this.queue.length > 0) {
      const job = this.queue.shift();
      job?.reject(error);
    }
  }

  private rejectAll(error: Error): void {
    if (this.current) {
      this.clearJobTimer();
      this.current.reject(error);
      this.current = null;
    }
    this.rejectQueued(error);
    this.cancelled = false;
    this.callbacks.onThinkingChange?.(false);
  }

  private armJobTimeout(job: EngineJob, limits: GoLimits): void {
    this.clearJobTimer();
    const timeoutMs = this.resolveJobTimeoutMs(limits);
    this.jobTimer = setTimeout(() => {
      if (this.current !== job) {
        return;
      }
      this.worker.postMessage({ type: 'stop' } satisfies WorkerIn);
      this.failCurrent(
        new Error(
          `Engine job timed out after ${timeoutMs}ms while waiting for bestmove.`,
        ),
      );
    }, timeoutMs);
  }

  private clearJobTimer(): void {
    if (!this.jobTimer) {
      return;
    }
    clearTimeout(this.jobTimer);
    this.jobTimer = null;
  }

  private resolveJobTimeoutMs(limits: GoLimits): number {
    if (typeof limits.movetime === 'number' && limits.movetime > 0) {
      return Math.min(
        JOB_TIMEOUT_MAX_MS,
        Math.max(
          JOB_TIMEOUT_FALLBACK_MS,
          Math.ceil(limits.movetime + JOB_TIMEOUT_BUFFER_MS),
        ),
      );
    }
    return JOB_TIMEOUT_FALLBACK_MS;
  }

  private isLegalMoveForFen(fen: string, uci: string): boolean {
    if (uci.length !== 4 && uci.length !== 5) {
      return false;
    }

    try {
      const chess = new Chess(fen);
      const from = uci.slice(0, 2) as Square;
      const to = uci.slice(2, 4) as Square;
      const promotionChar = uci[4];
      if (promotionChar && !['q', 'r', 'b', 'n'].includes(promotionChar)) {
        return false;
      }
      const promotion =
        promotionChar === 'q' ||
        promotionChar === 'r' ||
        promotionChar === 'b' ||
        promotionChar === 'n'
          ? promotionChar
          : undefined;
      return Boolean(chess.move({ from, to, promotion }));
    } catch {
      return false;
    }
  }
}
