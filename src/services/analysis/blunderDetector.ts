import { Chess } from 'chess.js';
import { resolveChessComGameUrl } from '../../services/chesscom/gameUrl';
import type { FilteredGame } from '../../services/chesscom/types';
import { parseOpeningFromPgn } from '../../services/chesscom/filterGames';
import { makeBlunderKey } from './reviewKeys';
import type { AppSettings } from '../../types/settings';
import type { PersonalBlunder, PlyAnalysis } from '../../types/review';
import { classifySwing } from './classifySwing';
import { swingCp } from './evalPerspective';

function newBlunderId(): string {
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

export interface BlunderDetectInput {
  filtered: FilteredGame;
  username: string;
  ply: PlyAnalysis;
  settings: AppSettings;
  existingKeys: Set<string>;
}

export function detectBlunder(input: BlunderDetectInput): PersonalBlunder | null {
  const { filtered, username, ply, settings, existingKeys } = input;
  const swing = swingCp(ply.evalBeforeCp, ply.evalAfterCp);

  if (swing < settings.leakDetector.minSwingCp) {
    return null;
  }

  const dedupeKey = makeBlunderKey(filtered.game.url, ply.ply);
  if (existingKeys.has(dedupeKey)) {
    return null;
  }
  existingKeys.add(dedupeKey);

  const classification = classifySwing(swing, settings.leakDetector.blunderSwingCp);
  const bestSan = uciToSan(ply.fenBefore, ply.bestMoveUci);
  const opening = parseOpeningFromPgn(filtered.game.pgn);
  const playedAt = new Date(filtered.game.end_time * 1000).toISOString();

  const tags = [
    filtered.filterMatched.repertoireSide.includes('queens')
      ? 'queens-gambit'
      : 'caro-kann',
    classification,
    `${filtered.game.time_class}-leak`,
  ];

  return {
    version: 1,
    id: newBlunderId(),
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
      evalBeforeCp: ply.evalBeforeCp,
      evalAfterCp: ply.evalAfterCp,
      swingCp: swing,
      bestMove: { san: bestSan, uci: ply.bestMoveUci },
      depth: ply.depth,
      movetimeMs: settings.leakDetector.scanMovetimeMs,
      classification,
      engine: { name: 'stockfish', jsVersion: '18.x' },
    },
    quiz: {
      prompt: 'Find the best move you missed in your rapid game.',
      showPlayedMoveAsWrong: true,
      difficulty: classification === 'blunder' ? 'hard' : 'normal',
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
