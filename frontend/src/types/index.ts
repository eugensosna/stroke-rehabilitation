
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