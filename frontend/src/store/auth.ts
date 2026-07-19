import { defineStore } from "pinia"
import { computed, ref } from "vue";
import type { AuthResponse, LoginCredentials } from "../types";
import { AuthService } from "../services/auth_service";


export const useAuthStore = defineStore('auth', () => {
  
  const authToken = ref<AuthResponse | null>(null);

  const isAuthenticated = computed(() => !!authToken.value );

  async function login(credentials: LoginCredentials): Promise<void> {
    const response = await AuthService.login(credentials);
    sessionStorage.setItem('token', response.accessToken);
    sessionStorage.setItem('authToken', JSON.stringify(response));


    // Implementation for login function
  }

  function logout(): void {
    authToken.value = null
    sessionStorage.removeItem('token')
    sessionStorage.removeItem('authToken')
  }

  return {authToken, isAuthenticated, login, logout};


});