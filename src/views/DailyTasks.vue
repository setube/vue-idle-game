<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useDailyTaskStore } from '../stores/dailyTasks'
import { useGameStore } from '../stores/game'
import { showToast } from 'vant'

const router = useRouter()
const dailyTaskStore = useDailyTaskStore()
const gameStore = useGameStore()

// 每日任务列表
const pendingTasks = ref([])
const completedTasks = ref([])
const activeTab = ref(0)

// 玩家资源
const resources = ref({
  gold: 0,
  level: 1
})

// 加载每日任务数据
const loadTasksData = async () => {
  await dailyTaskStore.initialize()
  pendingTasks.value = dailyTaskStore.pendingDailyTasks
  completedTasks.value = dailyTaskStore.completedDailyTasks
  // 加载玩家资源
  const gameState = await gameStore.loadGameState()
  if (gameState) {
    resources.value.gold = gameState.resources.gold
    resources.value.level = gameState.level
  }
}

// 领取任务奖励
const claimTaskReward = async (taskId) => {
  const result = await dailyTaskStore.claimTaskReward(taskId)
  if (result.success) {
    // 刷新任务列表
    pendingTasks.value = dailyTaskStore.pendingDailyTasks
    completedTasks.value = dailyTaskStore.completedDailyTasks
    // 刷新玩家资源
    const gameState = await gameStore.loadGameState()
    if (gameState) resources.value.gold = gameState.resources.gold
  }
  showToast(result.message)
}

// 计算任务进度百分比
const getTaskProgress = (task) => {
  return Math.min(100, Math.floor((task.progress / task.target) * 100))
}

// 计算下次刷新时间
const getNextRefreshTime = () => {
  // 获取当前UTC时间
  const now = new Date()
  // 创建下一个整点的时间点
  const nextRefresh = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    now.getUTCHours() + 1, // 下一个小时
    0, 0, 0 // 00:00:00.000
  ))
  return nextRefresh
}

// 格式化下次刷新时间
const formatNextRefreshTime = () => {
  const nextRefresh = getNextRefreshTime()
  // 格式化为本地日期和时间
  return `${nextRefresh.toLocaleDateString()} ${nextRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
}

// 生命周期钩子
onMounted(() => {
  loadTasksData()
})
</script>

<template>
  <div class="daily-tasks-container">
    <div class="daily-tasks-header">
      <div class="back-button">
        <van-button icon="arrow-left" size="small" @click="router.go(-1)">返回</van-button>
      </div>
      <div class="resource-panel">
        <div class="resource">
          <span class="resource-label">金币</span>
          <span class="resource-value">{{ resources.gold }}</span>
        </div>
      </div>
      <div class="refresh-info">
        <span>下次刷新: {{ formatNextRefreshTime() }}</span>
      </div>
    </div>
    <van-tabs v-model:active="activeTab" animated swipeable>
      <van-tab title="进行中">
        <div class="task-list" v-if="pendingTasks.length > 0">
          <van-cell-group inset>
            <van-cell v-for="task in pendingTasks" :key="task.id" :title="task.name" :label="task.description">
              <template #right-icon>
                <div class="task-progress-wrapper">
                  <van-progress :percentage="getTaskProgress(task)" :show-pivot="false" color="#2db7f5" />
                  <span class="progress-text">{{ task.progress }}/{{ task.target }}</span>
                </div>
              </template>
            </van-cell>
          </van-cell-group>
        </div>
        <div class="empty-state" v-else>
          <van-empty description="没有进行中的任务" />
        </div>
      </van-tab>
      <van-tab title="已完成">
        <div class="task-list" v-if="completedTasks.length > 0">
          <van-cell-group inset>
            <van-cell v-for="task in completedTasks" :key="task.id" :title="task.name" :label="task.description">
              <template #right-icon>
                <van-button size="small" type="primary" @click="claimTaskReward(task.id)" :disabled="task.claimed">
                  {{ task.claimed ? '已领取' : '领取奖励' }}
                </van-button>
              </template>
            </van-cell>
          </van-cell-group>
        </div>
        <div class="empty-state" v-else>
          <van-empty description="没有已完成的任务" />
        </div>
      </van-tab>
    </van-tabs>
    <div class="rewards-info">
      <h3>任务奖励说明</h3>
      <p>完成任务可以获得额外的金币和经验值奖励。任务会在每小时整点刷新。</p>
    </div>
  </div>
</template>

<style scoped>
.daily-tasks-container {
  display: flex;
  flex-direction: column;
  padding: 16px;
}

.daily-tasks-header {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 24px;
}

.back-button {
  margin-bottom: 8px;
}

.resource-panel {
  display: flex;
  justify-content: space-between;
  background-color: var(--van-cell-background);
  padding: 12px;
  border-radius: 8px;
}

.resource {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.resource-label {
  font-size: 0.8rem;
  color: #646566;
}

.resource-value {
  font-size: 1.1rem;
  font-weight: bold;
  color: var(--van-cell-text-color);
}

.refresh-info {
  text-align: center;
  font-size: 0.9rem;
  color: #646566;
  margin-bottom: 8px;
}

.task-list {
  margin-top: 16px;
}

.task-progress-wrapper {
  width: 120px;
  display: flex;
  flex-direction: column;
}

.progress-text {
  font-size: 0.8rem;
  color: #646566;
  text-align: right;
  margin-top: 4px;
}

.empty-state {
  margin-top: 32px;
}

.rewards-info {
  margin-top: 24px;
  background-color: var(--van-cell-background);
  padding: 16px;
  border-radius: 8px;
}

.rewards-info h3 {
  margin-top: 0;
  margin-bottom: 8px;
}

.rewards-info p {
  margin: 0;
  font-size: 0.9rem;
  color: #646566;
}
</style>