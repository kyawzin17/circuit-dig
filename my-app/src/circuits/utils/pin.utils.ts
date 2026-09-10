export function getPinIdFromHandle(
  handleId?: string | null
): string | null {

  if (!handleId) {
    return null;
  }

  return handleId
    .replace(/-source$/, "")
    .replace(/-target$/, "");
}