import type { AxiosError, AxiosInstance } from 'axios'

export function setupInterceptors(instance: AxiosInstance): void {
  instance.interceptors.request.use(
    (config) => config,
    (error: AxiosError) => Promise.reject(error),
  )

  instance.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => Promise.reject(error),
  )
}
