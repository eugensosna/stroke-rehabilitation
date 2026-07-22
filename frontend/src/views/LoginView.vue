<script setup lang="ts">
import { ref } from "vue";
import { type LoginCredentials } from "../types";
import { AuthStore } from "../store/auth_store";
import { api } from "../services/api";


// const router = useRouter();
const email = ref("");
const password = ref("");
const authStore =  AuthStore();

async function handleLogin() {
  if (!email.value.trim()) {
    console.error("Email is required");
    return;
  }
  console.log(email.value, password.value);

  const credentials: LoginCredentials = {
    email: email.value,
    password: password.value,
  };

  try {
    await authStore.login(credentials);
    // router.push("root");
  } catch (e) {
    console.error("Login failed", e);
  }
}
async function handleTest() {
  const credentials: LoginCredentials = {
    email: email.value,
    password: password.value,
  };

  const response = await fetch("http://localhost:8080/api/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(credentials),
  });

  const data = await response.json();
  console.log("fetch response:", data);

  await authStore.login(credentials);
  console.log(authStore.isAuthenticated);

  console.log("test request get ");
  let responseTest  = await fetch("http://localhost:8080/api/auth/test", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },

  });

  console.log("test request get response:", responseTest);

  responseTest = await api.get("auth/test");
  console.log("test request API get response:", responseTest);




  


}
</script>

<template>
  <div class="login-page">
    <form @submit="handleLogin" novalidate>
      <label>E-mail</label>
      <input id="login-email" v-model="email" type="email" />
      <label for="login-password">password</label>
      <input v-model="password" type="password" />

      <button type="submit">Login</button>
    </form>
    <button @click="handleTest">Test</button>
  </div>
</template>
