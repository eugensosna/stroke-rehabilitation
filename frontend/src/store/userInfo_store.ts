import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { AuthStore } from './auth_store'
import type { userInfo } from '@/types/user'
import { UserDetailService } from '@/services/user_service'

export const userStore = defineStore('user', () => {
  const storageUserInfoKey: string = 'userInfo'
  const savedUserInfo = ref<userInfo | null>(null)
  const getUserInfo = computed(async () => {
    let result: userInfo | null = null
    if (!savedUserInfo.value) {
      let userInfoFromStorage: userInfo | null = null
      const rawUserInfoFromStorage = sessionStorage.getItem(storageUserInfoKey)
      if (rawUserInfoFromStorage) {
        try {
          userInfoFromStorage = JSON.parse(rawUserInfoFromStorage)
        } catch (e) {
          console.error(
            'erro parse data from key {} data {}, error {}',
            storageUserInfoKey,
            rawUserInfoFromStorage,
            e,
          )
        }
      }
      if (userInfoFromStorage) {
        savedUserInfo.value = userInfoFromStorage
      }
    }
    if (!savedUserInfo.value) {
      if (AuthStore().isAuthenticated) {
        try {
          const response = await UserDetailService.profile()
          if (response) {
            savedUserInfo.value = response
            sessionStorage.setItem(storageUserInfoKey, JSON.stringify(response))
          }
        } catch (error) {
          console.error('error fetch current user info  from remote', error)
        }
      }
    }
    if (savedUserInfo.value) {
      result = savedUserInfo.value
    }

    return result
  })
  return { getUserInfo }
})
