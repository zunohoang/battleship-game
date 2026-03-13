import axios from 'axios'
import i18n from '@/i18n'
import { setupInterceptors } from './interceptors'

const baseURL = import.meta.env.VITE_API_BASE_URL

if (!baseURL) {
  throw new Error(i18n.t('errors.apiBaseUrlRequired'))
}

export const apiClient = axios.create({
  baseURL,
  timeout: 10_000,
  withCredentials: true,
})

setupInterceptors(apiClient)

export default apiClient
