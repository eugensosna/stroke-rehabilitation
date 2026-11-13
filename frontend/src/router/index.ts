import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior(_to, _from, savedPosition) {
    return savedPosition || { left: 0, top: 0 }
  },
  routes: [
    {
      path: '/',
      redirect: '/exercises',
    },
    {
      path: '/exercises',
      name: 'Exercises',
      component: () => import('../views/exercises/ExercisesList.vue'),
      meta: { title: 'Вправи' },
    },
    {
      path: '/exercises/:id',
      name: 'Exercise',
      component: () => import('../views/exercises/ExerciseView.vue'),
      // калібрування не обов'язкове: без нього використовуються типові діапазони
      meta: { title: 'Вправа' },
    },
    {
      path: '/calibration',
      name: 'Calibration',
      component: () => import('../views/exercises/CalibrationView.vue'),
      meta: { title: 'Калібрування' },
    },
    {
      path: '/ecommerce',
      name: 'Ecommerce',
      component: () => import('../views/Ecommerce.vue'),
      meta: {
        title: 'eCommerce Dashboard',
      },
    },
    {
      path: '/calendar',
      name: 'Calendar',
      component: () => import('../views/Others/Calendar.vue'),
      meta: {
        title: 'Calendar',
      },
    },
    {
      path: '/profile/:id',
      name: 'Profile',
      component: () => import('../views/Others/UserProfile.vue'),
      meta: {
        title: 'Profile',
      },
      props: true,
    },
    {
      path: '/form-elements',
      name: 'Form Elements',
      component: () => import('../views/Forms/FormElements.vue'),
      meta: {
        title: 'Form Elements',
      },
    },
    {
      path: '/basic-tables',
      name: 'Basic Tables',
      component: () => import('../views/Tables/BasicTables.vue'),
      meta: {
        title: 'Basic Tables',
      },
    },
    {
      path: '/line-chart',
      name: 'Line Chart',
      component: () => import('../views/Chart/LineChart/LineChart.vue'),
    },
    {
      path: '/bar-chart',
      name: 'Bar Chart',
      component: () => import('../views/Chart/BarChart/BarChart.vue'),
    },
    {
      path: '/alerts',
      name: 'Alerts',
      component: () => import('../views/UiElements/Alerts.vue'),
      meta: {
        title: 'Alerts',
      },
    },
    {
      path: '/avatars',
      name: 'Avatars',
      component: () => import('../views/UiElements/Avatars.vue'),
      meta: {
        title: 'Avatars',
      },
    },
    {
      path: '/badge',
      name: 'Badge',
      component: () => import('../views/UiElements/Badges.vue'),
      meta: {
        title: 'Badge',
      },
    },

    {
      path: '/buttons',
      name: 'Buttons',
      component: () => import('../views/UiElements/Buttons.vue'),
      meta: {
        title: 'Buttons',
      },
    },

    {
      path: '/images',
      name: 'Images',
      component: () => import('../views/UiElements/Images.vue'),
      meta: {
        title: 'Images',
      },
    },
    {
      path: '/videos',
      name: 'Videos',
      component: () => import('../views/UiElements/Videos.vue'),
      meta: {
        title: 'Videos',
      },
    },
    {
      path: '/blank',
      name: 'Blank',
      component: () => import('../views/Pages/BlankPage.vue'),
      meta: {
        title: 'Blank',
      },
    },

    {
      path: '/error-404',
      name: '404 Error',
      component: () => import('../views/Errors/FourZeroFour.vue'),
      meta: {
        title: '404 Error',
      },
    },

    {
      path: '/signin',
      name: 'SignIn',
      component: () => import('../views/Auth/SignIn.vue'),
      meta: {
        title: 'SignIn',
      },
    },
    {
      path: '/signup',
      name: 'SignUp',
      component: () => import('../views/Auth/SignUp.vue'),
      meta: {
        title: 'SignUp',
      },
    },
    {
      path: '/game/arkade',
      name: 'Arkade',
      component: () => import('../views/games/GameArcade1.vue'),
    },
    {
      path: '/game/arkade2',
      name: 'Arkade2',
      component: () => import('../views/games/ArkanoidGame.vue'),
    }
  ],
})

export default router

router.beforeEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} | Реабілітація кисті` : 'Реабілітація кисті'
})
