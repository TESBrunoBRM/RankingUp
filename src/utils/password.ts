export const PASSWORD_MIN_LENGTH = 8;

export function meetsPasswordRequirements(password: string): boolean {
  return password.length >= PASSWORD_MIN_LENGTH;
}
