import axios from 'axios'
import { setupInterceptors } from './interceptors'

const baseURL = import.meta.env.VITE_API_BASE_URL

if (!baseURL) {
  throw new Error('VITE_API_BASE_URL is required')
}

export const apiClient = axios.create({
  baseURL,
  timeout: 10_000,
  withCredentials: true,
})

setupInterceptors(apiClient)

export default apiClient
