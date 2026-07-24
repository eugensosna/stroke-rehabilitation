import { createRouter, createWebHistory } from "vue-router";
import HelloWorld from "../components/HelloWorld.vue";
import LoginView from "../views/LoginView.vue";
import { RouteNames, RoutePaths } from "../types/index.ts";



const router = createRouter({
    routes: [
        {
            path: RoutePaths.HOME,
            name: RouteNames.HOME,
            component: LoginView
        },
        {
            path: RoutePaths.ABOUT,
            name: RouteNames.ABOUT,
            component: HelloWorld
        },
        {
            path: RoutePaths.NOT_FOUND,
            name: RouteNames.NOT_FOUND,
            redirect: RoutePaths.HOME
        }
    ],
    history: createWebHistory(import.meta.env.BASE_URL)
});

export default router;