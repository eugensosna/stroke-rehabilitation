import { api } from './api'
import type { userInfo } from '@/types/user'

export const UserDetailService = {
  async profile(): Promise<userInfo | undefined> {
    let result = undefined
    const response = await api.get<userInfo>('/users/profile')
    if (response.data) {
      result = response.data
    }
    return result
  },
}
