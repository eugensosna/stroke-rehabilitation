<template>
  <div class="relative" ref="dropdownRef">
    <button class="flex items-center text-gray-700 dark:text-gray-400" @click.prevent="toggleDropdown">
      <!-- FIXME: add if auth and user name -->
      <span class="mr-3 overflow-hidden rounded-full h-11 w-11">
        <img v-if="!isAuthenticated" src="/images/user/anonym.png" alt="User" />
        <img v-else src="/images/user/user_no_photo.svg" alt="User" />
      </span>



      <span class="block mr-1 font-medium text-theme-sm">{{ userName }}</span>

      <ChevronDownIcon :class="{ 'rotate-180': dropdownOpen }" />
    </button>

    <!-- Dropdown Start -->
    <div v-if="dropdownOpen"
      class="absolute right-0 mt-[17px] flex w-[260px] flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark">
      <div>
        <span class="block font-medium text-gray-700 text-theme-sm dark:text-gray-400">
          {{ currentUser?.name }}
        </span>
        <span class="mt-0.5 block text-theme-xs text-gray-500 dark:text-gray-400">
          {{ currentUser?.email }}
        </span>
      </div>

      <ul class="flex flex-col gap-1 pt-4 pb-3 border-b border-gray-200 dark:border-gray-800">
        <li v-for="item in menuItems" :key="item.href">
          <router-link :to="item.href"
            class="flex items-center gap-3 px-3 py-2 font-medium text-gray-700 rounded-lg group text-theme-sm hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300">
            <!-- SVG icon would go here -->
            <component :is="item.icon" class="text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-300" />
            {{ item.text }}
          </router-link>
        </li>
      </ul>
      <router-link v-if="isAuthenticated" to="/signout" @click="signOut"
        class="flex items-center gap-3 px-3 py-2 mt-3 font-medium text-gray-700 rounded-lg group text-theme-sm hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300">
        <LogoutIcon class="text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-300" />
        Sign out
      </router-link>
      <router-link v-else to="/signin" @click="signIn"
        class="flex items-center gap-3 px-3 py-2 mt-3 font-medium text-gray-700 rounded-lg group text-theme-sm hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300">
        <LogoutIcon class="text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-300" />
        Sign In
      </router-link>
    </div>
    <!-- Dropdown End -->
  </div>
</template>

<script setup lang="ts">
import { UserCircleIcon, ChevronDownIcon, LogoutIcon, SettingsIcon, InfoCircleIcon } from '@/icons'
import { RouterLink } from 'vue-router'
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { AuthStore } from '@/store/auth_store'
import { userStore } from '@/store/userInfo_store';
import type { userInfo } from '@/types/user';



const authStore = AuthStore();

const dropdownOpen = ref(false)
const dropdownRef = ref<HTMLElement | null>(null)

const currentUser = ref<userInfo | null>(null);

const menuItems = computed(() => {
  let profilepath = '/profile';
  if (currentUser.value) {
    profilepath = profilepath + "/" + currentUser.value.id.toString();
  }

  return [
    { href: profilepath, icon: UserCircleIcon, text: 'Edit profile' },
    { href: '/chat', icon: SettingsIcon, text: 'Account settings' },
    { href: profilepath, icon: InfoCircleIcon, text: 'Support' },
  ];
});


onMounted(async () => {
  try {
    const user = await userStore().getUserInfo;
    currentUser.value = user ?? null
  } catch (e) {
    currentUser.value = null;
    console.error(" userMrnu mounted, get current user error ", e);
  }
})

const toggleDropdown = () => {
  dropdownOpen.value = !dropdownOpen.value
}

const closeDropdown = () => {
  dropdownOpen.value = false
}

const isAuthenticated = authStore.isAuthenticated;
const userName = authStore.userName;

const signOut = () => {
  // Implement sign out logic here
  console.log('SignIng out...')
  AuthStore().logout();
  closeDropdown()
}


const signIn = () => {
  // Implement sign out logic here
  console.log('SignIng in...')
  // AuthStore().logout();
  closeDropdown()
}


const handleClickOutside = (event: MouseEvent) => {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
    closeDropdown()
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>
