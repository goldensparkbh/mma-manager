export const MIN_MEMBER_NAME_PARTS = 3;

export function countMemberNameParts(name: string): number {
  return name.trim().split(/\s+/).filter(Boolean).length;
}

export function isValidMemberFullName(name: string): boolean {
  return countMemberNameParts(name) >= MIN_MEMBER_NAME_PARTS;
}
