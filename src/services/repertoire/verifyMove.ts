export function verifyMove(
  userUci: string,
  expectedUci: string,
  aliases?: string[],
): boolean {
  const normalized = userUci.toLowerCase();
  const expected = expectedUci.toLowerCase();
  if (normalized === expected) {
    return true;
  }
  if (aliases?.some((alias) => alias.toLowerCase() === normalized)) {
    return true;
  }
  return false;
}
