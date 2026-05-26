import {
  BLUNDER_SWING_CP,
  INACCURACY_SWING_CP,
  MISTAKE_SWING_CP,
} from '../../constants/analysis';
import type { Classification } from '../../types/review';

export function classifySwing(
  swing: number,
  blunderThreshold = BLUNDER_SWING_CP,
): Classification {
  if (swing >= blunderThreshold) {
    return 'blunder';
  }
  if (swing >= MISTAKE_SWING_CP) {
    return 'mistake';
  }
  if (swing >= INACCURACY_SWING_CP) {
    return 'inaccuracy';
  }
  return 'inaccuracy';
}
