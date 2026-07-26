import { defineStore } from "pinia";
import { computed, ref } from "vue";
import type { AuthResponse,  LoginCredentials } from "../types";
import { AuthService } from "../services/auth_service";

export const AuthStore = defineStore("auth", () => {

  const authToken = ref<AuthResponse | null>(null);
  const isAuthenticated = computed(() => {
    let result = false;
    if (!authToken.value) {
      const authTokenFromStorage: AuthResponse | null = sessionStorage.getItem(
        "authToken",
      )
        ? JSON.parse(sessionStorage.getItem("authToken") as string)
        : null;
      if (authTokenFromStorage) {
        authToken.value = authTokenFromStorage;
      }
    }
    if (authToken.value) {
      if (authToken.value.accessToken) {
        const now = Date.now() / 1000;
        const expiresAt = authToken.value.expiresIn;
        result = now < expiresAt;
      }
      // result = true;
    }
    return result;
  });

  async function login(credentials: LoginCredentials): Promise<void> {
    const response = await AuthService.login(credentials);
    sessionStorage.setItem("token", response.accessToken);
    sessionStorage.setItem("authToken", JSON.stringify(response));
    authToken.value = response;
  }

  function logout(): void {
    authToken.value = null;
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("authToken");
    authToken.value = null;
  }

  if (sessionStorage.getItem("authToken")) {
    authToken.value = JSON.parse(sessionStorage.getItem("authToken") as string);
  }

  const userName = computed(() =>  {
    let result:string = "Anonym";
    if (isAuthenticated.value) {
      result= "User";

    }

    return result;

  });

  return { authToken, isAuthenticated, login, logout, userName };
});
