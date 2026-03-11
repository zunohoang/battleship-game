import { AxiosHeaders } from 'axios'
import type { AxiosError, AxiosInstance } from 'axios'
import { buildAuthorizationHeader, getAccessToken, setAccessToken } from './authToken'

function readAccessTokenFromResponse(data: unknown): string | null {
  if (!data || typeof data !== 'object') {
    return null
  }

  const token = (data as { accessToken?: unknown }).accessToken
  if (typeof token !== 'string' || token.trim() === '') {
    return null
  }

  return token
}

function setAuthorizationHeader(instance: AxiosInstance, token: string): void {
  instance.defaults.headers.common.Authorization = buildAuthorizationHeader(token)
}

export function setupInterceptors(instance: AxiosInstance): void {
  const existingToken = getAccessToken()
  if (existingToken) {
    setAuthorizationHeader(instance, existingToken)
  }

  instance.interceptors.request.use(
    (config) => {
      const token = getAccessToken()
      if (!token) {
        return config
      }

      const authorization = buildAuthorizationHeader(token)
      if (config.headers && typeof config.headers.set === 'function') {
        config.headers.set('Authorization', authorization)
      } else {
        const headers = new AxiosHeaders(config.headers)
        headers.set('Authorization', authorization)
        config.headers = headers
      }

      return config
    },
    (error: AxiosError) => Promise.reject(error),
  )

  instance.interceptors.response.use(
    (response) => {
      const token = readAccessTokenFromResponse(response.data)
      if (token) {
        setAccessToken(token)
        setAuthorizationHeader(instance, token)
      }

      return response
    },
    (error: AxiosError) => Promise.reject(error),
  )
}
