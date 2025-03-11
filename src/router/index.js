import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: import('../views/Home.vue')
  },
  {
    path: '/setting',
    name: 'Setting',
    component: import('../views/Settings.vue')
  },
  {
    path: '/achievements',
    name: 'Achievements',
    component: import('../views/Achievements.vue')
  },
  {
    path: '/skills',
    name: 'Skills',
    component: import('../views/Skills.vue')
  },
  {
    path: '/shop',
    name: 'Shop',
    component: import('../views/Shop.vue')
  },
  {
    path: '/daily-tasks',
    name: 'DailyTasks',
    component: import('../views/DailyTasks.vue')
  },
  {
    path: '/notifications',
    name: 'Notifications',
    component: import('../views/Notifications.vue')
  },
  {
    path: '/pets',
    name: 'Pets',
    component: import('../views/Pets.vue')
  }
]

// 创建路由实例
const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router