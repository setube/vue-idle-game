import { createRouter, createWebHashHistory } from 'vue-router'

import Home from '../views/Home.vue'
import Settings from '../views/Settings.vue'
import Achievements from '../views/Achievements.vue'
import Skills from '../views/Skills.vue'
import Shop from '../views/Shop.vue'
import DailyTasks from '../views/DailyTasks.vue'
import Notifications from '../views/Notifications.vue'
import Pets from '../views/Pets.vue'
import Exploration from '../views/Exploration.vue'
import Equipment from '../views/Equipment.vue'

// 定义路由
const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home
  },
  {
    path: '/setting',
    name: 'Setting',
    component: Settings
  },
  {
    path: '/achievements',
    name: 'Achievements',
    component: Achievements
  },
  {
    path: '/skills',
    name: 'Skills',
    component: Skills
  },
  {
    path: '/shop',
    name: 'Shop',
    component: Shop
  },
  {
    path: '/daily-tasks',
    name: 'DailyTasks',
    component: DailyTasks
  },
  {
    path: '/notifications',
    name: 'Notifications',
    component: Notifications
  },
  {
    path: '/pets',
    name: 'Pets',
    component: Pets
  },
  {
    path: '/exploration',
    name: 'Exploration',
    component: Exploration
  },
  {
    path: '/equipment',
    name: 'Equipment',
    component: Equipment
  }
]

// 创建路由实例
const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router