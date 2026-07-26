import type { Ref } from "vue"

export interface LoginCredentials {
  email: string
  password: string
}
export interface AuthResponse {
  tokenType: string,
  accessToken: string
  refreshToken: string
  expiresIn: number
}

export const RouteNames = {
  HOME:`Home`,
  ABOUT: `About`,
  USER_PROFILE: `UserProfile`,
  NOT_FOUND: `NotFound` ,
}

export const RoutePaths ={
  HOME:`/`,
  ABOUT: '/about',
  USER_PROFILE: '/user/:id',
  NOT_FOUND: '/:pathMatch(.*)*',
}
export interface AuthStoreInterface{
  authToken: Ref<AuthResponse | null>
  isAuthenticated: boolean,
  login: void,
  logout: void

}
