import { Chess, type Move } from 'chess.js';

function moveToUci(move: Move): string {
  return `${move.from}${move.to}${move.promotion ?? ''}`;
}
import type { AnalysisResult } from '../../types/engine';
import type { FilteredGame } from '../chesscom/types';
import type { AppSettings } from '../../types/settings';
import type { PersonalBlunder, ConversionMissed, PlyAnalysis } from '../../types/review';
import { getCacheEntry, makeCacheKey, putCacheEntry } from '../../storage/cacheRepo';
import { putBlunder, loadBlunderDedupeKeys } from '../../storage/blundersRepo';
import { putConversion, loadConversionDedupeKeys } from '../../storage/conversionRepo';
import { makeConversionKey } from './reviewKeys';
import { detectBlunder } from './blunderDetector';
import {
  createConversionTracker,
  detectConversionMiss,
  updatePeak,
} from './conversionDetector';
import { toUserPerspective } from './evalPerspective';

export type AnalyzeFn = (fen: string, movetimeMs: number) => Promise<AnalysisResult>;

export interface ScanOptions {
  signal?: AbortSignal;
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new DOMException('Scan cancelled.', 'AbortError');
  }
}

export interface ScanProgress {
  gamesDone: number;
  gamesTotal: number;
  pliesDone: number;
  newBlunders: number;
  newConversions: number;
  currentGameUrl?: string;
}

export interface ScanResult {
  blunders: PersonalBlunder[];
  conversions: ConversionMissed[];
  gamesScanned: number;
  usedFixture: boolean;
}

function userIsSideToMove(userColor: 'white' | 'black', turn: 'w' | 'b'): boolean {
  return (
    (userColor === 'white' && turn === 'w') ||
    (userColor === 'black' && turn === 'b')
  );
}

async function analyzePly(
  gameUrl: string,
  fenBefore: string,
  playedUci: string,
  ply: number,
  userColor: 'white' | 'black',
  movetimeMs: number,
  analyze: AnalyzeFn,
): Promise<{
  evalBeforeCp: number;
  evalAfterCp: number;
  bestMoveUci: string;
  depth: number;
  fenAfter: string;
}> {
  const cacheKey = makeCacheKey(gameUrl, ply);
  const cached = await getCacheEntry(cacheKey);
  if (cached) {
    const chess = new Chess(fenBefore);
    chess.move({
      from: playedUci.slice(0, 2),
      to: playedUci.slice(2, 4),
      promotion: playedUci[4] as 'q' | 'r' | 'b' | 'n' | undefined,
    });
    return {
      evalBeforeCp: cached.evalBeforeCp,
      evalAfterCp: cached.evalAfterCp,
      bestMoveUci: cached.bestMoveUci,
      depth: cached.depth,
      fenAfter: chess.fen(),
    };
  }

  const before = await analyze(fenBefore, movetimeMs);
  const evalBeforeCp = toUserPerspective(
    before.scoreCp,
    fenBefore.includes(' w ') ? 'w' : 'b',
    userColor,
  );

  const chess = new Chess(fenBefore);
  const move = chess.move({
    from: playedUci.slice(0, 2),
    to: playedUci.slice(2, 4),
    promotion: playedUci[4] as 'q' | 'r' | 'b' | 'n' | undefined,
  });
  if (!move) {
    throw new Error(`Illegal move in PGN replay: ${playedUci} at ply ${ply}`);
  }
  const fenAfter = chess.fen();

  const after = await analyze(fenAfter, movetimeMs);
  const evalAfterCp = toUserPerspective(
    after.scoreCp,
    fenAfter.includes(' w ') ? 'w' : 'b',
    userColor,
  );

  await putCacheEntry({
    cacheKey,
    fen: fenBefore,
    playedMoveUci: playedUci,
    evalBeforeCp,
    evalAfterCp,
    bestMoveUci: before.bestMoveUci,
    depth: Math.max(before.depth, after.depth),
    createdAt: new Date().toISOString(),
    version: 1,
  });

  return {
    evalBeforeCp,
    evalAfterCp,
    bestMoveUci: before.bestMoveUci,
    depth: Math.max(before.depth, after.depth),
    fenAfter,
  };
}

export async function scanFilteredGames(
  filteredGames: FilteredGame[],
  username: string,
  settings: AppSettings,
  analyze: AnalyzeFn,
  onProgress?: (progress: ScanProgress) => void,
  options?: ScanOptions,
): Promise<ScanResult> {
  const signal = options?.signal;
  throwIfAborted(signal);

  const blunders: PersonalBlunder[] = [];
  const conversions: ConversionMissed[] = [];
  const blunderKeys = await loadBlunderDedupeKeys();
  const conversionKeys = await loadConversionDedupeKeys();
  const movetimeMs = settings.leakDetector.scanMovetimeMs;
  let pliesDone = 0;

  for (let gi = 0; gi < filteredGames.length; gi += 1) {
    throwIfAborted(signal);
    const filtered = filteredGames[gi]!;
    const replay = new Chess();
    replay.loadPgn(filtered.game.pgn);
    const moves = replay.history({ verbose: true });
    replay.reset();

    const tracker = createConversionTracker();
    const userColor = filtered.userColor;
    const userMoveIndices: number[] = [];

    for (let i = 0; i < moves.length; i += 1) {
      const isWhiteMove = i % 2 === 0;
      const isUserMove =
        (userColor === 'white' && isWhiteMove) ||
        (userColor === 'black' && !isWhiteMove);
      if (isUserMove) {
        userMoveIndices.push(i);
      }
    }

    for (let ui = 0; ui < userMoveIndices.length; ui += 1) {
      throwIfAborted(signal);
      const moveIndex = userMoveIndices[ui]!;
      const isLastUserMove = ui === userMoveIndices.length - 1;

      // Replay up to this user move
      replay.reset();
      for (let j = 0; j < moveIndex; j += 1) {
        const m = moves[j]!;
        replay.move({ from: m.from, to: m.to, promotion: m.promotion });
      }

      const userMove = moves[moveIndex]!;
      const fenBefore = replay.fen();
      const ply = moveIndex + 1;
      const sideToMove = replay.turn() === 'w' ? 'white' : 'black';

      if (!userIsSideToMove(userColor, replay.turn())) {
        continue;
      }

      const analysis = await analyzePly(
        filtered.game.url,
        fenBefore,
        moveToUci(userMove),
        ply,
        userColor,
        movetimeMs,
        analyze,
      );

      pliesDone += 1;

      const contextMoves: string[] = [];
      replay.reset();
      for (let j = 0; j <= moveIndex; j += 1) {
        const m = moves[j]!;
        const played = replay.move({ from: m.from, to: m.to, promotion: m.promotion });
        if (played) {
          contextMoves.push(played.san);
        }
      }

      const plyData: PlyAnalysis = {
        cacheKey: makeCacheKey(filtered.game.url, ply),
        fenBefore,
        fenAfter: analysis.fenAfter,
        ply,
        playedMoveUci: moveToUci(userMove),
        playedMoveSan: userMove.san,
        evalBeforeCp: analysis.evalBeforeCp,
        evalAfterCp: analysis.evalAfterCp,
        bestMoveUci: analysis.bestMoveUci,
        depth: analysis.depth,
        pvContextSan: contextMoves,
        moveNumber: Math.ceil(ply / 2),
        sideToMove,
      };

      updatePeak(tracker, analysis.evalAfterCp, ply);

      const blunder = detectBlunder({
        filtered,
        username,
        ply: plyData,
        settings,
        existingKeys: blunderKeys,
      });
      if (blunder) {
        await putBlunder(blunder);
        blunders.push(blunder);
      }

      const conversion = detectConversionMiss({
        filtered,
        username,
        ply: plyData,
        tracker,
        settings,
        isLastUserMove,
      });
      if (conversion) {
        const conversionKey = makeConversionKey(
          filtered.game.url,
          conversion.analysis.plyOfPeak,
        );
        if (!conversionKeys.has(conversionKey)) {
          conversionKeys.add(conversionKey);
          await putConversion(conversion);
          conversions.push(conversion);
        }
      }

      onProgress?.({
        gamesDone: gi,
        gamesTotal: filteredGames.length,
        pliesDone,
        newBlunders: blunders.length,
        newConversions: conversions.length,
        currentGameUrl: filtered.game.url,
      });
    }

    onProgress?.({
      gamesDone: gi + 1,
      gamesTotal: filteredGames.length,
      pliesDone,
      newBlunders: blunders.length,
      newConversions: conversions.length,
      currentGameUrl: filtered.game.url,
    });
  }

  return {
    blunders,
    conversions,
    gamesScanned: filteredGames.length,
    usedFixture: false,
  };
}
