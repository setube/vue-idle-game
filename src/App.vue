<script setup>
import { ref } from 'vue'
import { useGameStore } from './stores/game'

const gameStore = useGameStore()
// 监听深色模式设置变化
const darkMode = ref('light')

// 加载设置
const loadSettings = async () => {
  const settings = await gameStore.loadSettings()
  if (settings) darkMode.value = settings.darkMode
}
// 初始化
loadSettings()
</script>

<template>
  <div class="app-container">
    <van-config-provider :theme="darkMode">
      <router-view v-slot="{ Component }">
        <component :is="Component" />
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
</style>
