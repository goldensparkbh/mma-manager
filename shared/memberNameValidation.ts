export const MIN_MEMBER_NAME_PARTS = 3;

export function countMemberNameParts(name: string): number {
  return name.trim().split(/\s+/).filter(Boolean).length;
}

export function isValidMemberFullName(name: string): boolean {
  return countMemberNameParts(name) >= MIN_MEMBER_NAME_PARTS;
}

export const MEMBER_FULL_NAME_ERROR =
  "Full name must include at least 3 names (e.g. first, middle, and last)";

export function assertMemberFullName(name: string): void {
  if (!isValidMemberFullName(name)) {
    throw new Error(MEMBER_FULL_NAME_ERROR);
  }
}
