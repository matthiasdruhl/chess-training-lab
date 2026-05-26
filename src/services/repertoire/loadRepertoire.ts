import repertoireData from '../../../data/repertoire/queens-gambit-caro-kann.json';
import type { RepertoireFile } from '../../types/repertoire';

export function loadRepertoire(): RepertoireFile {
  return repertoireData as unknown as RepertoireFile;
}
