import handoffsData from '../../../data/bridge/handoffs.json';
import type { BridgeFile, BridgeHandoff } from '../../types/bridge';
import type { TrainingColor } from '../../types/outOfBook';
import { loadRepertoire } from '../repertoire/loadRepertoire';
import { findNodeById } from '../repertoire/treeUtils';
import { listPresets } from '../presets/loadPresets';

export function loadBridgeFile(): BridgeFile {
  return handoffsData as unknown as BridgeFile;
}

let handoffValidationError: string | null = null;

function validateHandoffLinks(file: BridgeFile): BridgeHandoff[] {
  const repertoire = loadRepertoire();
  const presets = listPresets();
  const knownPresetIds = new Set(presets.map((preset) => preset.id));

  const missingNodeIds = new Set<string>();
  const missingPresetIds = new Set<string>();
  const duplicateHandoffIds = new Set<string>();
  const seenHandoffIds = new Set<string>();

  for (const handoff of file.handoffs) {
    if (seenHandoffIds.has(handoff.id)) {
      duplicateHandoffIds.add(handoff.id);
    } else {
      seenHandoffIds.add(handoff.id);
    }

    const hasNode = Boolean(findNodeById(repertoire, handoff.repertoireNodeId));
    if (!hasNode) {
      missingNodeIds.add(handoff.repertoireNodeId);
    }

    if (!knownPresetIds.has(handoff.linkedPresetId)) {
      missingPresetIds.add(handoff.linkedPresetId);
    }
  }

  const problems: string[] = [];
  if (missingNodeIds.size > 0) {
    problems.push(
      `missing repertoire node ids: ${Array.from(missingNodeIds.values()).join(', ')}`,
    );
  }
  if (missingPresetIds.size > 0) {
    problems.push(`missing preset ids: ${Array.from(missingPresetIds.values()).join(', ')}`);
  }
  if (duplicateHandoffIds.size > 0) {
    problems.push(`duplicate handoff ids: ${Array.from(duplicateHandoffIds.values()).join(', ')}`);
  }

  if (problems.length > 0) {
    const message = `Bridge handoffs contain invalid links (${problems.join('; ')})`;
    handoffValidationError = message;

    if (!import.meta.env.PROD) {
      throw new Error(message);
    }

    // In production, fail soft by logging and filtering out invalid records so
    // the rest of the bridge experience can proceed.
    console.error(message);

    return file.handoffs.filter(
      (handoff) =>
        !duplicateHandoffIds.has(handoff.id) &&
        Boolean(findNodeById(repertoire, handoff.repertoireNodeId)) &&
        knownPresetIds.has(handoff.linkedPresetId),
    );
  }

  handoffValidationError = null;
  return file.handoffs;
}

let cachedHandoffs: BridgeHandoff[] | null = null;

export function listHandoffs(): BridgeHandoff[] {
  if (!cachedHandoffs) {
    cachedHandoffs = validateHandoffLinks(loadBridgeFile());
  }
  return cachedHandoffs;
}

export function getHandoffValidationError(): string | null {
  return handoffValidationError;
}

export function filterHandoffsByRepertoireNodeId(
  handoffs: BridgeHandoff[],
  repertoireNodeId: string,
): BridgeHandoff[] {
  return handoffs.filter((handoff) => handoff.repertoireNodeId === repertoireNodeId);
}

export function filterHandoffsByColor(handoffs: BridgeHandoff[], color: TrainingColor): BridgeHandoff[] {
  return handoffs.filter((handoff) => handoff.color === color);
}

