<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from './stores/game'
import { useSkillStore } from './stores/skills'
import { useShopStore } from './stores/shop'
import { useDailyTaskStore } from './stores/dailyTasks'
import { usePetStore } from './stores/pets'
import { useAchievementStore } from './stores/achievements'

const router = useRouter()
const gameStore = useGameStore()
const skillStore = useSkillStore()
const shopStore = useShopStore()
const dailyTaskStore = useDailyTaskStore()
const petStore = usePetStore()
const achievementStore = useAchievementStore()

// 监听深色模式设置变化
const darkMode = ref('light')

// 加载设置
const loadSettings = async () => {
  const settings = await gameStore.loadSettings()
  if (settings) darkMode.value = settings.darkMode
}

// 添加路由守卫，在路由切换前同步数据
const setupRouteGuard = () => {
  router.beforeEach(async (to, from, next) => {
    try {
      // 获取当前游戏状态
      const gameState = await gameStore.loadGameState()
      if (gameState) {
        // 同步各个store的数据
        await Promise.all([
          gameStore.saveGameState(gameState),
          skillStore.saveSkills(),
          shopStore.saveShopData(),
          dailyTaskStore.saveDailyTasks(),
          petStore.savePets(),
          achievementStore.saveStats()
        ])
      }
    } catch (error) {
      console.error('路由切换时同步数据失败:', error)
    }
    // 继续路由导航
    next()
  })
}

// 初始化
onMounted(() => {
  loadSettings()
  setupRouteGuard()
})
</script>

<template>
  <div class="app-container">
    <van-config-provider :theme="darkMode">
      <router-view v-slot="{ Component }">
        <keep-alive include="{ DailyTasks }">
          <component :is="Component" />
        </keep-alive>
      </router-view>
      <van-back-top />
    </van-config-provider>
  </div>
</template>

<style>
::-webkit-scrollbar {
  width: 6px;
  background: transparent;
}
::-webkit-scrollbar:horizontal {
  height: 6px;
}
::-webkit-scrollbar-track {
  border-radius: 10px;
}
::-webkit-scrollbar-thumb {
  background-color: #0003;
  border-radius: 10px;
  transition: all 0.2s ease-in-out;
}
::-webkit-scrollbar-thumb:hover {
  cursor: pointer;
  background-color: #0000004d;
}

body {
  -webkit-font-smoothing: antialiased;
  margin: 0;
  font-family: Open Sans, -apple-system, BlinkMacSystemFont, Helvetica Neue,
    Helvetica, Segoe UI, Arial, Roboto, PingFang SC, miui, Hiragino Sans GB,
    Microsoft Yahei, sans-serif;
  font-size: 16px;
  overflow-x: auto;
  background-color: #f5f5f5;
  color: #333;
}
.app-container {
  max-width: 600px;
  margin: 0 auto;
}
.van-theme-dark body {
  color: #f5f5f5;
  background-color: black;
}
.van-button--default {
  border: none !important;
}
.van-cell-group--inset {
  margin: 0 !important;
}
.van-tabs--line .van-tabs__wrap {
  border-radius: var(--van-cell-group-inset-radius);
}
.van-swipe-cell__right .van-button--square {
  height: 100%;
}
.van-notice-bar {
  border-radius: var(--van-cell-group-inset-radius);
}
</style>
