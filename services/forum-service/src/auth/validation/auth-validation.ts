export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const USERNAME_REGEX = /^[\p{L}\p{M}\p{N} ]+$/u;
export const SIGNATURE_REGEX = /^[^<>]*$/;

export function trimString(value: unknown): unknown {
  return typeof value === 'string' ? value.trim().normalize('NFC') : value;
}
