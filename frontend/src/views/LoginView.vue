<script setup lang="ts">
import { ref } from 'vue';
import { useAuthStore } from '../store/auth';
import { type LoginCredentials } from '../types';


// const router = useRouter();
const email = ref('');
const password = ref('');
const authStore = useAuthStore();

async function handleLogin() {
    if (!email.value.trim()) {



    }
    console.log(email.value, password.value);

        const credentials: LoginCredentials = {
            email: email.value,
            password: password.value
        };

    try {
        await authStore.login(credentials);
        // router.push("root");
    } catch (e) {
        console.error('Login failed', e);
    }
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
    </div>
</template>