/** Normalize engine eval (side-to-move POV) to the user's perspective. */
export function toUserPerspective(
  evalCp: number,
  sideToMove: 'w' | 'b',
  userColor: 'white' | 'black',
): number {
  const userIsWhite = userColor === 'white';
  const stmIsWhite = sideToMove === 'w';
  return userIsWhite === stmIsWhite ? evalCp : -evalCp;
}

export function swingCp(evalBeforeUser: number, evalAfterUser: number): number {
  return Math.abs(evalBeforeUser - evalAfterUser);
}
