export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export const USERNAME_REGEX = /^[\p{L}\p{M}\p{N} ]+$/u
export const SIGNATURE_REGEX = /^[^<>]*$/

export type AuthValidationCode =
  | 'INVALID_EMAIL'
  | 'USERNAME_REQUIRED'
  | 'USERNAME_TOO_LONG'
  | 'USERNAME_INVALID_FORMAT'
  | 'PASSWORD_TOO_SHORT'
  | 'PASSWORD_TOO_LONG'
  | 'SIGNATURE_TOO_LONG'
  | 'SIGNATURE_INVALID_FORMAT'
  | 'PASSWORD_MISMATCH'
  | 'CURRENT_PASSWORD_REQUIRED'
  | 'NEW_PASSWORD_SAME_AS_OLD'

export type LoginValidationResult = {
  email: string
  password: string
  errorCode: AuthValidationCode | null
}

export type RegisterValidationResult = {
  username: string
  email: string
  password: string
  confirmPassword: string
  errorCode: AuthValidationCode | null
}

export type ProfileValidationResult = {
  username: string
  signature: string
  errorCode: AuthValidationCode | null
}

function normalizeText(value: string): string {
  return value.trim().normalize('NFC')
}

export function validateEmail(email: string): AuthValidationCode | null {
  const normalizedEmail = normalizeText(email)
  return EMAIL_REGEX.test(normalizedEmail) ? null : 'INVALID_EMAIL'
}

export function validateUsername(
  username: string,
  required = true,
): AuthValidationCode | null {
  const normalizedUsername = normalizeText(username)

  if (normalizedUsername.length === 0) {
    return required ? 'USERNAME_REQUIRED' : null
  }

  if (normalizedUsername.length > 20) {
    return 'USERNAME_TOO_LONG'
  }

  if (!USERNAME_REGEX.test(normalizedUsername)) {
    return 'USERNAME_INVALID_FORMAT'
  }

  return null
}

export function validatePassword(
  password: string,
  required = true,
): AuthValidationCode | null {
  if (password.length === 0) {
    return required ? 'PASSWORD_TOO_SHORT' : null
  }

  if (password.length < 8) {
    return 'PASSWORD_TOO_SHORT'
  }

  if (password.length > 72) {
    return 'PASSWORD_TOO_LONG'
  }

  return null
}

export function validateSignature(signature: string): AuthValidationCode | null {
  const normalizedSignature = normalizeText(signature)

  if (normalizedSignature.length > 200) {
    return 'SIGNATURE_TOO_LONG'
  }

  if (!SIGNATURE_REGEX.test(normalizedSignature)) {
    return 'SIGNATURE_INVALID_FORMAT'
  }

  return null
}

export function validateLoginInput(
  email: string,
  password: string,
): LoginValidationResult {
  const normalizedEmail = normalizeText(email)

  return {
    email: normalizedEmail,
    password,
    errorCode: validateEmail(normalizedEmail) ?? validatePassword(password),
  }
}

export function validateRegisterInput(
  username: string,
  email: string,
  password: string,
  confirmPassword: string,
): RegisterValidationResult {
  const normalizedUsername = normalizeText(username)
  const normalizedEmail = normalizeText(email)
  const errorCode =
    validateUsername(normalizedUsername) ??
    validateEmail(normalizedEmail) ??
    validatePassword(password) ??
    (password !== confirmPassword ? 'PASSWORD_MISMATCH' : null)

  return {
    username: normalizedUsername,
    email: normalizedEmail,
    password,
    confirmPassword,
    errorCode,
  }
}

export function validateProfileInput(
  username: string,
  signature: string,
): ProfileValidationResult {
  const normalizedUsername = normalizeText(username)
  const normalizedSignature = normalizeText(signature)

  return {
    username: normalizedUsername,
    signature: normalizedSignature,
    errorCode:
      validateUsername(normalizedUsername) ??
      validateSignature(normalizedSignature),
  }
}

export type ChangePasswordValidationResult = {
  currentPassword: string
  newPassword: string
  errorCode: AuthValidationCode | null
}

export function validateChangePasswordInput(
  currentPassword: string,
  newPassword: string,
  confirmPassword: string,
): ChangePasswordValidationResult {
  if (normalizeText(currentPassword).length === 0) {
    return {
      currentPassword,
      newPassword,
      errorCode: 'CURRENT_PASSWORD_REQUIRED',
    }
  }

  const newErr = validatePassword(newPassword, true)
  if (newErr) {
    return { currentPassword, newPassword, errorCode: newErr }
  }

  if (newPassword !== confirmPassword) {
    return { currentPassword, newPassword, errorCode: 'PASSWORD_MISMATCH' }
  }

  if (newPassword === currentPassword) {
    return { currentPassword, newPassword, errorCode: 'NEW_PASSWORD_SAME_AS_OLD' }
  }

  return { currentPassword, newPassword, errorCode: null }
}
