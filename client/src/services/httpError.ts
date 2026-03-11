import { isAxiosError } from 'axios'

export type HttpErrorKind = 'timeout' | 'network' | 'unknown'

export function getHttpErrorKind(error: unknown): HttpErrorKind {
  if (!isAxiosError(error)) {
    return 'unknown'
  }

  if (error.code === 'ECONNABORTED') {
    return 'timeout'
  }

  if (error.message === 'Network Error') {
    return 'network'
  }

  return 'unknown'
}
