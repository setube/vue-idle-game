<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAchievementStore } from '../stores/achievements'
import { showToast } from 'vant'

const activeTab = ref(0);

const router = useRouter()
const achievementStore = useAchievementStore()

// 成就列表
const pendingAchievements = ref([])
const completedAchievements = ref([])

// 计算成就进度
const getAchievementProgress = (achievement) => {
  const stats = achievementStore.stats
  const requirement = achievement.requirement
  switch (requirement.type) {
    case 'gold':
      return Math.min(100, Math.floor((stats.gold_earned / requirement.value) * 100))
    case 'energy_spent':
      return Math.min(100, Math.floor((stats.energy_spent / requirement.value) * 100))
    case 'tasks_completed':
      return Math.min(100, Math.floor((stats.tasks_completed / requirement.value) * 100))
    case 'level':
      const currentLevel = achievementStore.getCurrentLevel()
      return Math.min(100, Math.floor((currentLevel / requirement.value) * 100))
    case 'task_specific':
      const taskCount = stats.task_specific_counts[requirement.taskId] || 0
      return Math.min(100, Math.floor((taskCount / requirement.count) * 100))
    default:
      return 0
  }
}

// 获取进度文本
const getProgressText = (achievement) => {
  const stats = achievementStore.stats
  const requirement = achievement.requirement
  switch (requirement.type) {
    case 'gold':
      return `${stats.gold_earned}/${requirement.value}`
    case 'energy_spent':
      return `${stats.energy_spent}/${requirement.value}`
    case 'tasks_completed':
      return `${stats.tasks_completed}/${requirement.value}`
    case 'level':
      const currentLevel = achievementStore.getCurrentLevel()
      return `${currentLevel}/${requirement.value}`
    case 'task_specific':
      const taskCount = stats.task_specific_counts[requirement.taskId] || 0
      return `${taskCount}/${requirement.count}`
    default:
      return '0/0'
  }
}

// 加载成就数据
const loadAchievements = async () => {
  await achievementStore.initialize()
  pendingAchievements.value = achievementStore.pendingAchievements
  completedAchievements.value = achievementStore.completedAchievements
}

// 领取成就奖励
const claimReward = async (achievementId) => {
  const result = await achievementStore.claimAchievementReward(achievementId)
  if (result.success) loadAchievements()
  showToast(result.message)
}

// 生命周期钩子
onMounted(() => {
  loadAchievements()
})
</script>

<template>
  <div class="achievements-container">
    <div class="achievements-header">
      <div class="back-button">
        <van-button icon="arrow-left" size="small" @click="router.go(-1)">返回</van-button>
      </div>
    </div>
    <div class="achievements-content">
      <van-tabs v-model:active="activeTab" animated swipeable>
        <van-tab title="进行中">
          <div class="achievement-list" v-if="pendingAchievements.length > 0">
            <van-cell-group inset v-for="achievement in pendingAchievements" :key="achievement.id">
              <van-cell :title="achievement.name" :icon="achievement.icon">
                <template #label>
                  <div class="achievement-description">{{ achievement.description }}</div>
                  <div class="achievement-progress">
                    <van-progress :percentage="getAchievementProgress(achievement)"
                      :pivot-text="getProgressText(achievement)" color="#7232dd" />
                  </div>
                </template>
              </van-cell>
            </van-cell-group>
          </div>
          <div class="empty-state" v-else>
            <van-empty description="暂无进行中的成就" />
          </div>
        </van-tab>
        <van-tab title="已完成">
          <!-- 已完成成就部分保持不变 -->
          <div class="achievement-list" v-if="completedAchievements.length > 0">
            <van-cell-group inset v-for="achievement in completedAchievements" :key="achievement.id">
              <van-cell :title="achievement.name" :icon="achievement.icon">
                <template #label>
                  <div class="achievement-description">{{ achievement.description }}</div>
                  <div class="achievement-reward">
                    奖励: {{ achievement.reward.gold }}金币, {{ achievement.reward.experience }}经验
                  </div>
                </template>
                <template #right-icon>
                  <van-button v-if="!achievement.rewardClaimed" size="small" type="primary"
                    @click="claimReward(achievement.id)">
                    领取奖励
                  </van-button>
                  <van-button v-else hairline disabled plain size="small" type="success">已领取</van-button>
                </template>
              </van-cell>
            </van-cell-group>
          </div>
          <div class="empty-state" v-else>
            <van-empty description="暂无已完成的成就" />
          </div>
        </van-tab>
      </van-tabs>
    </div>
  </div>
</template>

<style scoped>
.achievements-container {
  display: flex;
  flex-direction: column;
  padding: 16px;
}

.achievements-header {
  display: flex;
  flex-direction: column;
  margin-bottom: 24px;
}

.back-button {
  margin-bottom: 16px;
}

.achievements-header h1 {
  font-size: 1.5rem;
  margin: 0;
}

.achievements-content {
  flex: 1;
}

.achievement-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 16px;
}

.achievement-description {
  margin-bottom: 4px;
}

.achievement-progress {
  margin-top: 8px;
  margin-bottom: 4px;
}

.achievement-reward {
  color: #1989fa;
  font-size: 0.9rem;
}

.empty-state {
  margin-top: 32px;
}
</style>