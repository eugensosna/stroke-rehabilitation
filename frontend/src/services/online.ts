// import { api } from "./api";

import axios from 'axios'

const baseURL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? ''
//if (!baseURL.endsWith('/api')) {
//  baseURL += '/api';
//}
console.log('API Base URL:', baseURL)
export const api = axios.create({
  baseURL: baseURL,
  timeout: 10_000,
  headers: { 'Content-Type': 'application/json' },
})

export const OnLineService = {
  async checkIsOnline(): Promise<boolean> {
    let result = false
    try {
      const response = await api.get('/actuator/health')
      if (response.status === 200) {
        result = true
      }
    } catch (error) {
      console.error('OnLineService.checkIsOnline error:', error)
      return false
    }

    return result
  },
}
