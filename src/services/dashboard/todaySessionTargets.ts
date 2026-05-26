import { listHandoffs } from '../bridge/loadHandoffs';
import { listDeviations } from '../out-of-book/loadDeviations';
import { filterPresetsByModule, listPresets } from '../presets/loadPresets';
import { loadRepertoire } from '../repertoire/loadRepertoire';
import { flattenTrainableNodes } from '../repertoire/treeUtils';
import { listTacticsPacks } from '../tactics/loadStructureTactics';
import { getProgress, isProgressDue } from '../../storage/progressRepo';
import { getOutOfBookProgress } from '../../storage/outOfBookRepo';
import { getBridgeProgress } from '../../storage/bridgeRepo';
import { getTacticsProgressForPack } from '../../storage/tacticsProgressRepo';
import type { TodaySessionTargets } from '../../types/todaySession';

export async function resolveTodaySessionTargets(): Promise<TodaySessionTargets> {
  const repertoire = loadRepertoire();
  const trainableNodes = repertoire.roots.flatMap((root) =>
    flattenTrainableNodes(root),
  );

  let repertoireNodeId: string | undefined;
  for (const { node } of trainableNodes) {
    const progress = await getProgress(node.id);
    if (isProgressDue(progress)) {
      repertoireNodeId = node.id;
      break;
    }
  }
  if (!repertoireNodeId) {
    repertoireNodeId = trainableNodes[0]?.node.id;
  }

  const deviations = listDeviations().filter(
    (deviation) => !repertoireNodeId || deviation.parentNodeId === repertoireNodeId,
  );
  let deviationId: string | undefined;
  let parentNodeId: string | undefined;
  for (const deviation of deviations) {
    const progress = await getOutOfBookProgress(deviation.id);
    if (!progress || progress.status !== 'known') {
      deviationId = deviation.id;
      parentNodeId = deviation.parentNodeId;
      break;
    }
  }
  if (!deviationId && deviations[0]) {
    deviationId = deviations[0].id;
    parentNodeId = deviations[0].parentNodeId;
  }

  const handoffs = listHandoffs().filter(
    (handoff) => !repertoireNodeId || handoff.repertoireNodeId === repertoireNodeId,
  );
  let handoffId: string | undefined;
  let middlegamePresetId: string | undefined;
  for (const handoff of handoffs) {
    const progress = await getBridgeProgress(handoff.id);
    if (!progress?.continuedToMiddlegame) {
      handoffId = handoff.id;
      middlegamePresetId = handoff.linkedPresetId;
      break;
    }
  }
  if (!handoffId && handoffs[0]) {
    handoffId = handoffs[0].id;
    middlegamePresetId = handoffs[0].linkedPresetId;
  }

  if (!middlegamePresetId) {
    middlegamePresetId = filterPresetsByModule(listPresets(), 'middlegame')[0]?.id;
  }

  const packs = listTacticsPacks();
  let tacticsPackId: string | undefined;
  for (const pack of packs) {
    const progressRows = await getTacticsProgressForPack(pack.id);
    const masteredIds = new Set(
      progressRows.filter((row) => row.status === 'mastered').map((row) => row.puzzleId),
    );
    const hasUnsolved = pack.puzzleIds.some((puzzleId) => !masteredIds.has(puzzleId));
    if (hasUnsolved) {
      tacticsPackId = pack.id;
      break;
    }
  }
  if (!tacticsPackId) {
    tacticsPackId = packs[0]?.id;
  }

  const endgamePresetId = filterPresetsByModule(listPresets(), 'endgame')[0]?.id;

  return {
    repertoireNodeId,
    deviationId,
    parentNodeId,
    handoffId,
    middlegamePresetId,
    endgamePresetId,
    tacticsPackId,
  };
}
