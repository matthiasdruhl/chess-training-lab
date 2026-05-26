import { resolveGoLimits } from './limits';
import type {
  AnalysisResult,
  GoLimits,
  WorkerIn,
  WorkerOut,
} from '../../types/engine';

const QUEUE_DESTROYED = 'Engine queue destroyed';

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
  }

  private finishCurrent(bestMoveUci: string): void {
    if (this.destroyed) {
      return;
    }

    const job = this.current;
    if (!job) {
      return;
    }

    this.current = null;
    this.callbacks.onThinkingChange?.(false);

    if (this.cancelled) {
      this.cancelled = false;
      void this.pump();
      return;
    }

    if (job.kind === 'analyze') {
      const info = this.lastInfo;
      job.resolve({
        scoreCp: info?.scoreCp ?? 0,
        depth: info?.depth ?? 0,
        pv: info?.pv ?? [],
        bestMoveUci,
      });
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
      this.current.reject(error);
      this.current = null;
    }
    this.rejectQueued(error);
    this.cancelled = false;
    this.callbacks.onThinkingChange?.(false);
  }
}
