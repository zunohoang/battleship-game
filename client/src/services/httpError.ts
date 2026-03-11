import { isAxiosError } from 'axios'

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
