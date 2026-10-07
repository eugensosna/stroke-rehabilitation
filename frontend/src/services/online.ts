// import { api } from "./api";

import { api } from './api'

export const OnLineService = {
  async checkIsOnline(): Promise<boolean> {
    let result = false
    try {
      const response = await api.get('/auth/ping')
      if (response.status === 200) {
        result = true
      }
    } catch (error) {
      console.error('OnLineService.checkIsOnline error:', error)
      return result
    }

    return result
  },
}
