import { listHandoffs } from '../services/bridge/loadHandoffs';
import { listDueForReview } from './progressRepo';
import { countByIndexedStatus, countByUserStateStatus, sumCounts } from './countByStatus';
import { listAllBridgeProgress } from './bridgeRepo';
import { listAllDrillStats } from './drillStatsRepo';

const PUZZLE_STATUSES = ['new', 'learning', 'review', 'mastered'] as const;
const OOB_STATUSES = ['new', 'learning', 'review', 'known'] as const;

export interface ModuleStatusCounts {
  new: number;
  learning: number;
  review: number;
  mastered: number;
  open: number;
}

export interface OutOfBookStatusCounts {
  new: number;
  learning: number;
  review: number;
  known: number;
  open: number;
}

export interface BridgeStatusCounts {
  total: number;
  done: number;
  open: number;
}

export interface DrillStatsTotals {
  attempts: number;
  resets: number;
}

export interface DashboardStats {
  repertoireDue: number;
  outOfBook: OutOfBookStatusCounts;
  bridge: BridgeStatusCounts;
  drillStats: DrillStatsTotals;
  tactics: ModuleStatusCounts;
  blunders: ModuleStatusCounts;
  conversions: ModuleStatusCounts;
}

function toModuleCounts(counts: Record<string, number>): ModuleStatusCounts {
  const newCount = counts.new ?? 0;
  const learning = counts.learning ?? 0;
  const review = counts.review ?? 0;
  const mastered = counts.mastered ?? 0;
  return {
    new: newCount,
    learning,
    review,
    mastered,
    open: newCount + learning + review,
  };
}

export async function loadDashboardStats(): Promise<DashboardStats> {
  const [
    repertoireDue,
    outOfBookCounts,
    bridgeProgress,
    drillRows,
    tacticsCounts,
    blunderCounts,
    conversionCounts,
  ] = await Promise.all([
    listDueForReview().then((rows) => rows.length),
    countByIndexedStatus('out_of_book_progress', 'status', OOB_STATUSES),
    listAllBridgeProgress(),
    listAllDrillStats(),
    countByIndexedStatus('tactics_progress', 'status', PUZZLE_STATUSES),
    countByUserStateStatus('personal_blunders', PUZZLE_STATUSES),
    countByUserStateStatus('conversion_missed', PUZZLE_STATUSES),
  ]);

  const handoffTotal = listHandoffs().length;
  const bridgeDone = bridgeProgress.filter((row) => row.continuedToMiddlegame).length;

  const oobNew = outOfBookCounts.new ?? 0;
  const oobLearning = outOfBookCounts.learning ?? 0;
  const oobReview = outOfBookCounts.review ?? 0;
  const oobKnown = outOfBookCounts.known ?? 0;

  return {
    repertoireDue,
    outOfBook: {
      new: oobNew,
      learning: oobLearning,
      review: oobReview,
      known: oobKnown,
      open: oobNew + oobLearning + oobReview,
    },
    bridge: {
      total: handoffTotal,
      done: bridgeDone,
      open: Math.max(0, handoffTotal - bridgeDone),
    },
    drillStats: {
      attempts: drillRows.reduce((sum, row) => sum + row.attempts, 0),
      resets: drillRows.reduce((sum, row) => sum + row.resetCount, 0),
    },
    tactics: toModuleCounts(tacticsCounts),
    blunders: toModuleCounts(blunderCounts),
    conversions: toModuleCounts(conversionCounts),
  };
}

export { sumCounts, PUZZLE_STATUSES, OOB_STATUSES };
