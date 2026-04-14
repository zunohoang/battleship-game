import { isAxiosError } from 'axios'

export const GLOBALLY_HANDLED_ERROR_CODES = new Set(['INVALID_REFRESH_TOKEN'])

export function getApiErrorCode(error: unknown): string {
  if (!isAxiosError(error)) {
    return 'UNKNOWN_ERROR'
  }

  if (error.code === 'ECONNABORTED') {
    return 'TIMEOUT'
  }

  if (error.message === 'Network Error') {
    return 'NETWORK_ERROR'
  }

  const code = error.response?.data?.error
  if (typeof code === 'string' && code.length > 0) {
    return code
  }

  return 'UNKNOWN_ERROR'
}

export function isGloballyHandledApiError(error: unknown): boolean {
  return GLOBALLY_HANDLED_ERROR_CODES.has(getApiErrorCode(error))
}

export function getApiErrorMessage(error: unknown): string | null {
  if (!isAxiosError(error)) {
    return null
  }

  const message = error.response?.data?.message
  if (typeof message === 'string' && message.trim().length > 0) {
    return message
  }
  if (Array.isArray(message)) {
    return message.filter((item) => typeof item === 'string').join(', ') || null
  }

  return null
}
