import { createRouter, createWebHistory } from "vue-router";
import HelloWorld from "../components/HelloWorld.vue";
import LoginView from "../views/LoginView.vue";


const router = createRouter({
    routes: [
        {
            path: '/login',
            name: 'login',
            component: LoginView
        },
        {
            path: '/',
            name: 'root',
            component: HelloWorld
        },
        {
            path: '/:pathMatch(.*)*',
            redirect: '/'
        }
    ],
    history: createWebHistory(import.meta.env.BASE_URL)
});

export default router;