import { AxiosHeaders } from 'axios'
import type { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios'
import { buildAuthorizationHeader, clearAccessToken, getAccessToken, setAccessToken } from './authToken'

/** Modules register a callback here; called when refresh itself fails (session fully expired). */
let forceLogoutCallback: ((reasonCode?: string) => void) | null = null

export function setForceLogoutCallback(fn: (reasonCode?: string) => void): void {
  forceLogoutCallback = fn
}

let isRefreshing = false
let refreshResolvers: Array<(token: string) => void> = []
let refreshRejectors: Array<(err: unknown) => void> = []

function enqueueRefreshWaiter(
  onToken: (token: string) => void,
  onError: (err: unknown) => void,
): void {
  refreshResolvers.push(onToken)
  refreshRejectors.push(onError)
}

function flushRefreshSuccess(token: string): void {
  refreshResolvers.forEach((fn) => fn(token))
  refreshResolvers = []
  refreshRejectors = []
}

function flushRefreshFailure(err: unknown): void {
  refreshRejectors.forEach((fn) => fn(err))
  refreshResolvers = []
  refreshRejectors = []
}

function readAccessTokenFromResponse(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null
  const token = (data as { accessToken?: unknown }).accessToken
  if (typeof token !== 'string' || token.trim() === '') return null
  return token
}

function setAuthorizationHeader(instance: AxiosInstance, token: string): void {
  instance.defaults.headers.common.Authorization = buildAuthorizationHeader(token)
}

function clearAuthorizationHeader(instance: AxiosInstance): void {
  delete instance.defaults.headers.common.Authorization
}

function readApiErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') return undefined

  const response = (error as { response?: { data?: unknown } }).response
  if (!response || typeof response !== 'object') return undefined

  const data = response.data
  if (!data || typeof data !== 'object') return undefined

  const code = (data as { error?: unknown }).error
  return typeof code === 'string' ? code : undefined
}

function isPublicAuthRequest(url?: string): boolean {
  if (!url) return false

  return (
    url.includes('/auth/login') ||
    url.includes('/auth/register') ||
    url.includes('/auth/refresh')
  )
}

export function setupInterceptors(instance: AxiosInstance): void {
  const existingToken = getAccessToken()
  if (existingToken) {
    setAuthorizationHeader(instance, existingToken)
  }

  // Req auto attach accessToken from localStorage
  instance.interceptors.request.use(
    (config) => {
      const token = getAccessToken()
      if (!token || isPublicAuthRequest(config.url)) return config

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

  // Res auto update accessToken from response
  instance.interceptors.response.use(
    (response) => {
      const token = readAccessTokenFromResponse(response.data)
      if (token) {
        setAccessToken(token)
        setAuthorizationHeader(instance, token)
      }
      return response
    },
    async (error: AxiosError) => {
      const original = error.config as
        | (InternalAxiosRequestConfig & { _retried?: boolean })
        | undefined

      // Only intercept 401 on the first attempt and not on the refresh endpoint itself
      if (
        error.response?.status !== 401 ||
        !original ||
        original._retried ||
        isPublicAuthRequest(original.url)
      ) {
        return Promise.reject(error)
      }

      // If a refresh is already in flight, queue this request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          enqueueRefreshWaiter(
            (token) => {
              original._retried = true
              if (original.headers && typeof original.headers.set === 'function') {
                original.headers.set('Authorization', buildAuthorizationHeader(token))
              }
              resolve(instance(original))
            },
            reject,
          )
        })
      }

      isRefreshing = true
      original._retried = true

      try {
        const { data } = await instance.post<{ accessToken: string }>('/auth/refresh')
        const newToken = data.accessToken
        setAccessToken(newToken)
        setAuthorizationHeader(instance, newToken)
        flushRefreshSuccess(newToken)

        if (original.headers && typeof original.headers.set === 'function') {
          original.headers.set('Authorization', buildAuthorizationHeader(newToken))
        }

        return instance(original)
      } catch (refreshError) {
        clearAccessToken()
        clearAuthorizationHeader(instance)
        flushRefreshFailure(refreshError)
        forceLogoutCallback?.(readApiErrorCode(refreshError))
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    },
  )
}
