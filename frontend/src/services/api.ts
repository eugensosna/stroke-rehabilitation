import { AuthStore } from '@/store/auth_store'
import axios from 'axios'
let baseURL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '' + '/api'
if (!baseURL.endsWith('/api')) {
  baseURL += '/api'
}
console.log('API Base URL:', baseURL)
export const api = axios.create({
  baseURL: baseURL,
  timeout: 10_000,
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})
api.interceptors.request.use(
  (request) => {
    if (import.meta.env.DEV) {
      console.log(
        'Axios Outgoing Request:',
        request.method?.toUpperCase(),
        request.url,
        request.data,
      )
    }
    return request
  },
  (error) => {
    if (import.meta.env.DEV) {
      console.error('Axios Request Error:', error)
    }
    return Promise.reject(error)
  },
)

// Один спільний refresh для паралельних запитів, що отримали 401
let refreshPromise: Promise<void> | null = null

function redirectToSignIn() {
  AuthStore().logout()
  const current = window.location.pathname + window.location.search
  if (!window.location.pathname.startsWith('/signin')) {
    window.location.href = '/signin?redirect=' + encodeURIComponent(current)
  }
}

// On 401: try refresh once and repeat the request, otherwise redirect to sign in
api.interceptors.response.use(
  (response) => {
    if (import.meta.env.DEV) {
      console.log('Axios Incoming Response:', response.status, response.data)
    }
    // Unwrap ApiResponse<T> envelope from Spring Boot backend
    if (
      response.data !== null &&
      typeof response.data === 'object' &&
      'success' in response.data &&
      'message' in response.data &&
      'data' in response.data
    ) {
      response.data = response.data.data
    }
    return response
  },
  async (error) => {
    if (import.meta.env.DEV) {
      console.error(
        'Axios Error Object:',
        error.response?.status,
        error.response?.data || error.message,
      )
    }
    const original = error.config
    // помилки login/register/refresh обробляє сам виклик
    const isAuthCall = typeof original?.url === 'string' && original.url.startsWith('/auth/')
    if (error.response?.status === 401 && original && !isAuthCall && !original._retry) {
      original._retry = true
      if (sessionStorage.getItem('refreshToken')) {
        try {
          refreshPromise ??= AuthStore()
            .refreshToken()
            .finally(() => {
              refreshPromise = null
            })
          await refreshPromise
          original.headers.Authorization = `Bearer ${sessionStorage.getItem('token')}`
          return api(original)
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError)
        }
      }
      redirectToSignIn()
    }
    return Promise.reject(error)
  },
)

axios.interceptors.response.use(
  (response) => {
    if (import.meta.env.DEV) {
      console.log('Axios Incoming Response:', response.status, response.data)
    }
    return response
  },
  (error) => {
    if (import.meta.env.DEV) {
      console.error(
        'Axios Error Object:',
        error.response?.status,
        error.response?.data || error.message,
      )
    }
    return Promise.reject(error)
  },
)
