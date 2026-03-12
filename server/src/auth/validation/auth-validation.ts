export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const USERNAME_REGEX = /^[A-Za-z0-9]+$/;
export const SIGNATURE_REGEX = /^[^<>]*$/;

export function trimString(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}
