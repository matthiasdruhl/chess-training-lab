import { Chess } from 'chess.js';
import { resolveChessComGameUrl } from '../../services/chesscom/gameUrl';
import type { FilteredGame } from '../../services/chesscom/types';
import { userFailedToWin } from '../../services/chesscom/results';
import { parseOpeningFromPgn } from '../../services/chesscom/filterGames';
import type { AppSettings } from '../../types/settings';
import type { ConversionMissed, PlyAnalysis } from '../../types/review';

function newConversionId(): string {
  return crypto.randomUUID();
}

function uciToSan(fen: string, uci: string): string {
  try {
    const chess = new Chess(fen);
    const from = uci.slice(0, 2);
    const to = uci.slice(2, 4);
    const promo = uci[4];
    const move = chess.move({
      from,
      to,
      promotion: promo as 'q' | 'r' | 'b' | 'n' | undefined,
    });
    return move?.san ?? uci;
  } catch {
    return uci;
  }
}

export interface ConversionTracker {
  peakEvalCp: number;
  plyOfPeak: number;
  saved: boolean;
}

export function createConversionTracker(): ConversionTracker {
  return { peakEvalCp: -Infinity, plyOfPeak: 0, saved: false };
}

export function updatePeak(
  tracker: ConversionTracker,
  evalAfterUserCp: number,
  ply: number,
): void {
  if (evalAfterUserCp > tracker.peakEvalCp) {
    tracker.peakEvalCp = evalAfterUserCp;
    tracker.plyOfPeak = ply;
  }
}

export interface ConversionDetectInput {
  filtered: FilteredGame;
  username: string;
  ply: PlyAnalysis;
  tracker: ConversionTracker;
  settings: AppSettings;
  isLastUserMove: boolean;
}

export function detectConversionMiss(
  input: ConversionDetectInput,
): ConversionMissed | null {
  const { filtered, username, ply, tracker, settings, isLastUserMove } = input;

  if (tracker.saved) {
    return null;
  }

  const minPeak = settings.conversionReview.minPeakCp;
  const dropTo = settings.conversionReview.dropToCp;

  if (tracker.peakEvalCp < minPeak) {
    return null;
  }

  const evalNow = ply.evalAfterCp;
  const droppedToThreshold = evalNow <= dropTo;
  const failedToWin = isLastUserMove && userFailedToWin(filtered.result);

  if (!droppedToThreshold && !failedToWin) {
    return null;
  }

  tracker.saved = true;

  const dropFromPeak = tracker.peakEvalCp - evalNow;
  const bestSan = uciToSan(ply.fenBefore, ply.bestMoveUci);
  const opening = parseOpeningFromPgn(filtered.game.pgn);
  const playedAt = new Date(filtered.game.end_time * 1000).toISOString();

  const tags = [
    filtered.filterMatched.repertoireSide.includes('queens')
      ? 'queens-gambit'
      : 'caro-kann',
    'conversion',
    `${filtered.game.time_class}-${filtered.result}`,
  ];

  return {
    version: 1,
    id: newConversionId(),
    source: {
      platform: 'chess.com',
      username,
      gameId: filtered.game.url,
      gameUrl: resolveChessComGameUrl(filtered.game),
      playedAt,
      timeClass: filtered.game.time_class,
      result: filtered.result,
      userColor: filtered.userColor,
      opening,
      filterMatched: filtered.filterMatched,
    },
    position: {
      fen: ply.fenBefore,
      sideToMove: ply.sideToMove,
      moveNumber: ply.moveNumber,
      ply: ply.ply,
      playedMove: {
        san: ply.playedMoveSan,
        uci: ply.playedMoveUci,
      },
      pvContextSan: ply.pvContextSan,
    },
    analysis: {
      peakEvalCp: tracker.peakEvalCp,
      evalAtMomentCp: evalNow,
      dropFromPeakCp: dropFromPeak,
      bestMove: { san: bestSan, uci: ply.bestMoveUci },
      plyOfPeak: tracker.plyOfPeak,
      depth: ply.depth,
      movetimeMs: settings.conversionReview.scanMovetimeMs,
      engine: { name: 'stockfish', jsVersion: '18.x' },
    },
    quiz: {
      prompt: `You were winning (+${Math.round(tracker.peakEvalCp / 100)}). Find the move that keeps control.`,
      showPlayedMoveAsWrong: true,
    },
    userState: {
      status: 'new',
      attempts: 0,
      correctAttempts: 0,
      lastAttemptAt: null,
      masteredAt: null,
      notes: '',
    },
    tags,
  };
}
