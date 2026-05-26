import deviationsData from '../../../data/out-of-book/deviations.json';
import type { OutOfBookDeviation, OutOfBookFile, TrainingColor } from '../../types/outOfBook';
import { loadRepertoire } from '../repertoire/loadRepertoire';
import { findNodeById } from '../repertoire/treeUtils';

export function loadOutOfBookFile(): OutOfBookFile {
  return deviationsData as unknown as OutOfBookFile;
}

let deviationValidationError: string | null = null;

function validateDeviationLinks(file: OutOfBookFile): OutOfBookDeviation[] {
  const repertoire = loadRepertoire();

  const missingParentIds = new Set<string>();
  const duplicateDeviationIds = new Set<string>();
  const seenDeviationIds = new Set<string>();

  for (const deviation of file.deviations) {
    if (seenDeviationIds.has(deviation.id)) {
      duplicateDeviationIds.add(deviation.id);
    } else {
      seenDeviationIds.add(deviation.id);
    }

    const hasNode = Boolean(findNodeById(repertoire, deviation.parentNodeId));
    if (!hasNode) {
      missingParentIds.add(deviation.parentNodeId);
    }
  }

  const problems: string[] = [];
  if (missingParentIds.size > 0) {
    problems.push(
      `missing repertoire node ids: ${Array.from(missingParentIds.values()).join(', ')}`,
    );
  }
  if (duplicateDeviationIds.size > 0) {
    problems.push(`duplicate deviation ids: ${Array.from(duplicateDeviationIds.values()).join(', ')}`);
  }

  if (problems.length > 0) {
    const message = `Out-of-book deviations contain invalid links (${problems.join('; ')})`;
    deviationValidationError = message;

    if (!import.meta.env.PROD) {
      throw new Error(message);
    }

    // In production, fail soft by logging and filtering out invalid records so
    // the rest of the drill experience can proceed.
    console.error(message);

    return file.deviations.filter(
      (deviation) =>
        !duplicateDeviationIds.has(deviation.id) &&
        Boolean(findNodeById(repertoire, deviation.parentNodeId)),
    );
  }

  deviationValidationError = null;
  return file.deviations;
}

let cachedDeviations: OutOfBookDeviation[] | null = null;

export function listDeviations(): OutOfBookDeviation[] {
  if (!cachedDeviations) {
    cachedDeviations = validateDeviationLinks(loadOutOfBookFile());
  }
  return cachedDeviations;
}

export function getDeviationValidationError(): string | null {
  return deviationValidationError;
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

