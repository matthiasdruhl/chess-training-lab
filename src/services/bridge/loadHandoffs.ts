import handoffsData from '../../../data/bridge/handoffs.json';
import type { BridgeFile, BridgeHandoff } from '../../types/bridge';
import type { TrainingColor } from '../../types/outOfBook';

export function loadBridgeFile(): BridgeFile {
  return handoffsData as unknown as BridgeFile;
}

export function listHandoffs(): BridgeHandoff[] {
  return loadBridgeFile().handoffs;
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

