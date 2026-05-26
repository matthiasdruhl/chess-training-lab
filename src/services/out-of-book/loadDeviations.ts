import deviationsData from '../../../data/out-of-book/deviations.json';
import type { OutOfBookDeviation, OutOfBookFile, TrainingColor } from '../../types/outOfBook';

export function loadOutOfBookFile(): OutOfBookFile {
  return deviationsData as unknown as OutOfBookFile;
}

export function listDeviations(): OutOfBookDeviation[] {
  return loadOutOfBookFile().deviations;
}

export function filterDeviationsByParentNodeId(
  deviations: OutOfBookDeviation[],
  parentNodeId: string,
): OutOfBookDeviation[] {
  return deviations.filter((deviation) => deviation.parentNodeId === parentNodeId);
}

export function filterDeviationsByColor(
  deviations: OutOfBookDeviation[],
  color: TrainingColor,
): OutOfBookDeviation[] {
  return deviations.filter((deviation) => deviation.color === color);
}

