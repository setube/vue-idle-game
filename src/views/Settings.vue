<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from '../stores/game'
import { encryptData, decryptData } from '../stores/crypto'
import { showDialog, showConfirmDialog, showToast } from 'vant'
import { saveAs } from 'file-saver'

const router = useRouter()
const gameStore = useGameStore()

// 设置选项
const settings = ref({
  darkMode: 'light'
})

// 加载设置
const loadSettings = async () => {
  const savedSettings = await gameStore.loadSettings()
  if (savedSettings) settings.value = savedSettings
}

// 保存设置
const saveSettings = () => {
  gameStore.saveSettings(settings.value)
  if (settings.value.darkMode === 'dark') {
    document.documentElement.classList.add('van-theme-dark')
  } else {
    document.documentElement.classList.remove('van-theme-dark')
  }
  showToast('设置已保存')
}

// 重置游戏
const resetGame = () => {
  showConfirmDialog({
    title: '重置游戏',
    message: '确定要重置游戏吗？所有进度将丢失！',
    confirmButtonText: '确定',
    cancelButtonText: '取消',
  }).then(() => {
    gameStore.resetGame()
    showDialog({
      title: '成功',
      message: '游戏已重置'
    }).then(() => {
      router.push('/')
    })
  }).catch(() => { })
}

// 导出游戏数据
const exportGameData = async () => {
  const result = await gameStore.exportGameData()
  if (result.success) {
    saveAs(
      new Blob([encryptData(result.data)], { type: 'application/json' }),
      `我的普通放置-${new Date().toISOString().slice(0, 10)}-${Date.now()}.json`
    );
    showToast('游戏数据导出成功')
  } else {
    showDialog({
      title: '导出失败',
      message: result.error || '导出游戏数据时发生错误'
    })
  }
}

// 处理文件选择
const handleFileSelect = (event) => {
  const file = event.file
  if (!file) return
  // 确认导入
  showConfirmDialog({
    title: '导入游戏数据',
    message: '确定要导入游戏数据吗？当前游戏数据将被覆盖！',
    confirmButtonText: '确定',
    cancelButtonText: '取消',
  }).then(() => {
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const importData = decryptData(e.target.result)
        const result = await gameStore.importGameData(importData)
        if (result.success) {
          showDialog({
            title: '导入成功',
            message: '游戏数据已成功导入'
          }).then(() => {
            // 刷新页面以应用新数据
            location.reload()
          })
        } else {
          showDialog({
            title: '导入失败',
            message: result.error || '导入游戏数据时发生错误'
          })
        }
      } catch (error) {
        showDialog({
          title: '导入失败',
          message: '无效的游戏数据文件'
        })
      }
    }
    reader.readAsText(file)
  }).catch(() => { })
}

// 生命周期钩子
onMounted(() => {
  loadSettings()
})
</script>

<template>
  <div class="settings-container">
    <div class="settings-header">
      <div class="back-button">
        <van-button icon="arrow-left" size="small" @click="router.go(-1)">返回</van-button>
      </div>
    </div>
    <div class="settings-content">
      <van-cell-group inset title="基本设置">
        <van-cell title="深色模式">
          <template #right-icon>
            <van-switch v-model="settings.darkMode" active-value="dark" inactive-value="light" size="24" />
          </template>
        </van-cell>
      </van-cell-group>
      <van-cell-group inset title="数据管理">
        <van-cell title="导出游戏数据" label="将游戏数据导出为JSON文件备份">
          <template #right-icon>
            <van-button size="small" type="primary" @click="exportGameData">导出</van-button>
          </template>
        </van-cell>
        <van-cell title="导入游戏数据" label="从备份文件恢复游戏数据">
          <template #right-icon>
            <van-uploader accept=".json" :after-read="handleFileSelect" :max-count="1" :show-upload="false" :preview-image="false">
              <van-button size="small" type="warning">导入</van-button>
            </van-uploader>
          </template>
        </van-cell>
      </van-cell-group>
      <div class="button-group">
        <van-button type="primary" size="large" @click="saveSettings">保存设置</van-button>
        <van-button type="danger" size="large" @click="resetGame">重置游戏</van-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.settings-container {
  display: flex;
  flex-direction: column;
  padding: 16px;
}

.settings-header {
  display: flex;
  flex-direction: column;
  margin-bottom: 24px;
}

.back-button {
  margin-bottom: 16px;
}

.settings-header h1 {
  font-size: 1.5rem;
  margin: 0;
}

.settings-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.button-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 24px;
}

.custom-slider-button {
  width: 26px;
  height: 26px;
  background-color: #1989fa;
  border-radius: 50%;
  color: white;
  font-size: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>