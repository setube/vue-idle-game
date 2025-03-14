<script setup>
import { ref, onMounted, onUnmounted, onActivated } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from '../stores/game'
import { useSkillStore } from '../stores/skills'
import { useShopStore } from '../stores/shop'
import { useEventStore } from '../stores/events'
import { useAchievementStore } from '../stores/achievements'
import { useDailyTaskStore } from '../stores/dailyTasks'
import { useNotificationStore } from '../stores/notifications'
import { usePetStore } from '../stores/pets'
import { showDialog, showToast } from 'vant'

const router = useRouter()
const gameStore = useGameStore()
const shopStore = useShopStore()
const skillStore = useSkillStore()
const dailyTaskStore = useDailyTaskStore()
const notificationStore = useNotificationStore()

// 游戏状态
const resources = ref({
  gold: 0,
  energy: 100,
  experience: 0
})

const level = ref(1)
const tasks = ref([])
const selectedTask = ref(null)
const taskProgress = ref(0)
const isTaskRunning = ref(false)
// 添加体力恢复计时器和下次恢复时间
const energyTimer = ref(null)
const nextEnergyRecovery = ref(0)

// 初始化任务列表
const initTasks = () => {
  tasks.value = [
    { id: 1, name: '采集资源', minLevel: 1, duration: 5000, loading: false, reward: { gold: 10, experience: 5 }, energyCost: 10 },
    { id: 2, name: '探索地图', minLevel: 5, duration: 10000, loading: false, reward: { gold: 25, experience: 15 }, energyCost: 20 },
    { id: 3, name: '击败怪物', minLevel: 10, duration: 15000, loading: false, reward: { gold: 50, experience: 30 }, energyCost: 30 },
    { id: 4, name: '奇异之旅', minLevel: 20, duration: 30000, loading: false, reward: { gold: 75, experience: 60 }, energyCost: 40 },
    { id: 5, name: '偶遇公主', minLevel: 40, duration: 60000, loading: false, reward: { gold: 100, experience: 120 }, energyCost: 50 },
    { id: 6, name: '送回王国', minLevel: 60, duration: 120000, loading: false, reward: { gold: 125, experience: 240 }, energyCost: 60 },
    { id: 7, name: '牢狱之灾', minLevel: 80, duration: 240000, loading: false, reward: { gold: 150, experience: 480 }, energyCost: 70 },
    { id: 8, name: '大闹王国', minLevel: 100, duration: 480000, loading: false, reward: { gold: 175, experience: 960 }, energyCost: 80 },
    { id: 9, name: '发现真相', minLevel: 120, duration: 960000, loading: false, reward: { gold: 200, experience: 1920 }, energyCost: 90 },
    { id: 10, name: '成为国王', minLevel: 200, duration: 2000000, loading: false, reward: { gold: 1000, experience: 10000 }, energyCost: 1000 },
  ]
}

// Web Worker 相关
let gameWorker = null

// 初始化 Web Worker
const initWorker = () => {
  if (window.Worker) {
    gameWorker = new Worker(new URL('../workers/game.worker.js', import.meta.url), { type: 'module' })
    gameWorker.onmessage = (e) => {
      const { type, data } = e.data
      if (type === 'TASK_PROGRESS') {
        taskProgress.value = data.progress
        if (data.progress >= 100) completeTask()
      }
    }
  } else {
    showDialog({
      title: '不支持',
      message: '您的浏览器不支持Web Workers，游戏体验可能受到影响'
    })
  }
}

// 应用系统效果的通用函数
const applySystemEffect = (callback, errorMessage) => {
  try {
    return callback()
  } catch (error) {
    console.error(errorMessage, error)
    return null
  }
}

// 计算任务实际体力消耗
const calculateEnergyCost = (task) => {
  let actualEnergyCost = task.energyCost
  // 应用技能体力消耗减少
  const skillEffect = applySystemEffect(
    () => skillStore.applySkillsToEnergyCost(task),
    '技能系统未加载或应用失败'
  )
  if (skillEffect !== null) actualEnergyCost = skillEffect
  // 应用商店永久体力消耗减少
  applySystemEffect(() => {
    const energySave = shopStore.getEnergySaveValue()
    if (energySave > 0) actualEnergyCost = Math.max(1, Math.floor(actualEnergyCost * (1 - energySave)))
  }, '商店系统未加载或应用失败')
  // 应用宠物体力消耗减少
  applySystemEffect(() => {
    const petStore = usePetStore()
    const petEnergySave = petStore.getPetBonus(petStore.PET_TYPES.ENERGY, 'energySave') / 100
    if (petEnergySave > 0) actualEnergyCost = Math.max(1, Math.floor(actualEnergyCost * (1 - petEnergySave)))
  }, '宠物系统未加载或应用失败')
  return actualEnergyCost
}

// 计算任务实际奖励
const calculateReward = (task) => {
  // 获取原始奖励
  const baseReward = task.reward
  let finalReward = { ...baseReward }
  // 应用商店临时加成
  applySystemEffect(() => {
    const goldBoost = shopStore.getBoostValue('gold')
    if (goldBoost > 0) finalReward.gold = Math.floor(finalReward.gold * (1 + goldBoost))
  }, '商店系统未加载或应用失败')
  // 应用技能加成
  const skillReward = applySystemEffect(
    () => skillStore.applySkillsToReward(task, finalReward),
    '技能系统未加载或应用失败'
  )
  if (skillReward !== null) finalReward = skillReward
  // 应用商店永久加成
  applySystemEffect(() => {
    // 应用任务特定加成
    const goldBoost = shopStore.getTaskBoost(task.id, 'gold')
    if (goldBoost > 0) finalReward.gold = Math.floor(finalReward.gold * (1 + goldBoost))
    const expBoost = shopStore.getTaskBoost(task.id, 'experience')
    if (expBoost > 0) finalReward.experience = Math.floor(finalReward.experience * (1 + expBoost))
  }, '商店系统未加载或应用失败')
  // 应用宠物加成
  applySystemEffect(() => {
    const petStore = usePetStore()
    const petGoldBoost = petStore.getPetBonus(petStore.PET_TYPES.GOLD, 'goldBoost') / 100
    if (petGoldBoost > 0) finalReward.gold = Math.floor(finalReward.gold * (1 + petGoldBoost))
    const petExpBoost = petStore.getPetBonus(petStore.PET_TYPES.UTILITY, 'expBoost') / 100
    if (petExpBoost > 0) finalReward.experience = Math.floor(finalReward.experience * (1 + petExpBoost))
  }, '宠物系统未加载或应用失败')
  // 应用随机事件加成
  applySystemEffect(() => {
    const eventStore = useEventStore()
    const rewardMultiplier = eventStore.getRewardMultiplier()
    if (rewardMultiplier > 1) {
      finalReward.gold = Math.floor(finalReward.gold * rewardMultiplier)
      finalReward.experience = Math.floor(finalReward.experience * rewardMultiplier)
      // 消耗奖励倍数效果
      eventStore.consumeTaskEffect('reward_multiplier')
    }
  }, '事件系统未加载或应用失败')
  return finalReward
}

// 计算任务实际持续时间
const calculateTaskDuration = (task) => {
  let actualDuration = task.duration
  // 应用商店临时加成
  applySystemEffect(() => {
    const speedBoost = shopStore.getBoostValue('task_speed')
    if (speedBoost > 0) actualDuration = Math.max(1000, Math.floor(actualDuration / (1 + speedBoost)))
  }, '商店系统未加载或应用失败')
  return actualDuration
}

const startTask = (task) => {
  // 检查等级是否符合条件
  if (task.minLevel > level.value) {
    showToast(`任务要求等级${task.minLevel}级`)
    return
  }
  task.loading = true
  // 计算实际体力消耗
  const actualEnergyCost = calculateEnergyCost(task)
  // 检查体力是否足够
  if (resources.value.energy < actualEnergyCost) {
    showToast(`执行此任务需要${actualEnergyCost}点体力`)
    task.loading = false
    return
  }
  // 计算任务实际持续时间（应用事件系统速度修饰符）
  let actualDuration = calculateTaskDuration(task)
  applySystemEffect(() => {
    const eventStore = useEventStore()
    const speedModifier = eventStore.getTaskSpeedModifier()
    // 速度修饰符影响持续时间（值越大，速度越快，持续时间越短）
    if (speedModifier !== 1) actualDuration = Math.max(1000, Math.floor(actualDuration / speedModifier))
  }, '事件系统未加载或应用失败')
  selectedTask.value = task
  isTaskRunning.value = true
  resources.value.energy -= actualEnergyCost
  // 通过 Worker 处理任务
  if (gameWorker) {
    gameWorker.postMessage({
      type: 'START_TASK',
      data: { taskId: task.id, duration: actualDuration }
    })
  }
}

// 完成任务
const completeTask = () => {
  if (!selectedTask.value) return
  // 计算最终奖励
  const finalReward = calculateReward(selectedTask.value)
  // 完成任务后的奖励处理
  const processTaskReward = async (reward) => {
    // 更新资源
    resources.value.gold += reward.gold
    resources.value.experience += reward.experience
    // 检查成就
    applySystemEffect(() => {
      const achievementStore = useAchievementStore()
      return achievementStore.checkAchievements()
    }, '成就系统未加载或检查失败')
    // 检查每日任务
    applySystemEffect(() => {
      return dailyTaskStore.updateTaskProgress()
    }, '每日任务系统未加载或更新失败')
    // 随机触发宠物捕获事件
    applySystemEffect(async () => {
      // 根据任务难度和随机性决定是否捕获宠物
      const petStore = usePetStore()
      const captureChance = 0.05 + Math.min(10, level.value * 0.002) // 基础5%几率，每级增加0.2%
      if (Math.random() < captureChance) {
        // 随机生成宠物数据
        const petTypes = Object.values(petStore.PET_TYPES)
        const rarityChances = {
          [petStore.RARITY.COMMON]: 0.6,
          [petStore.RARITY.UNCOMMON]: 0.25,
          [petStore.RARITY.RARE]: 0.1,
          [petStore.RARITY.EPIC]: 0.04,
          [petStore.RARITY.LEGENDARY]: 0.01
        }
        // 确定宠物稀有度
        let petRarity = petStore.RARITY.COMMON
        const rarityRoll = Math.random()
        let cumulativeChance = 0
        for (const [rarity, chance] of Object.entries(rarityChances)) {
          cumulativeChance += chance
          if (rarityRoll < cumulativeChance) {
            petRarity = rarity
            break
          }
        }
        // 随机选择宠物类型
        const petType = petTypes[Math.floor(Math.random() * petTypes.length)]
        // 根据稀有度和类型生成宠物属性
        const rarityMultiplier = {
          [petStore.RARITY.COMMON]: 1,
          [petStore.RARITY.UNCOMMON]: 1.5,
          [petStore.RARITY.RARE]: 2,
          [petStore.RARITY.EPIC]: 3,
          [petStore.RARITY.LEGENDARY]: 5
        }
        // 生成宠物名称
        const petNames = [
          '小幽灵', '火焰鼠', '水精灵', '雷电兽', '岩石龟',
          '风之子', '光明使者', '暗影猫', '森林精灵', '沙漠蜥蜴',
          '雪山狐狸', '海洋鲸鱼', '草原狮子', '天空鹰', '星辰兔'
        ]
        const petName = petNames[Math.floor(Math.random() * petNames.length)]
        // 根据宠物类型生成对应属性
        let stats = {}
        const baseValue = 5.5 * rarityMultiplier[petRarity]
        switch (petType) {
          case petStore.PET_TYPES.GOLD:
            stats = { goldBoost: baseValue }
            break
          case petStore.PET_TYPES.ENERGY:
            stats = { energySave: baseValue }
            break
          case petStore.PET_TYPES.UTILITY:
            stats = { expBoost: baseValue }
            break
          case petStore.PET_TYPES.ATTACK:
            stats = { attackBoost: baseValue }
            break
          case petStore.PET_TYPES.DEFENSE:
            stats = { defenseBoost: baseValue }
            break
        }
        // 捕获宠物
        await petStore.capturePet({
          name: petName,
          type: petType,
          rarity: petRarity,
          stats
        })
        showToast('恭喜！你捕获了一只新宠物！')
      }
    }, '宠物系统未加载或捕获失败')
  }
  // 更新成就统计
  applySystemEffect(() => {
    const achievementStore = useAchievementStore()
    // 更新金币获取统计
    achievementStore.updateStats('gold', finalReward.gold)
    // 更新任务完成统计
    achievementStore.updateStats('tasks_completed', 1, selectedTask.value.id)
    // 更新体力消耗统计
    achievementStore.updateStats('energy_spent', selectedTask.value.energyCost)
  }, '成就系统未加载或更新失败')
  // 更新每日任务进度
  applySystemEffect(() => {
    // 更新金币收集任务
    dailyTaskStore.updateTaskProgress('gold', finalReward.gold)
    // 更新任务完成任务
    dailyTaskStore.updateTaskProgress('tasks_completed', 1)
    // 更新特定任务完成
    dailyTaskStore.updateTaskProgress('tasks_completed', 1, selectedTask.value.id)
    // 更新体力消耗任务
    dailyTaskStore.updateTaskProgress('energy_spent', selectedTask.value.energyCost)
  }, '每日任务系统未加载或更新失败')
  // 调用处理奖励函数
  processTaskReward(finalReward)
  // 检查是否升级
  checkLevelUp()
  // 重置任务状态
  taskProgress.value = 0
  selectedTask.value.loading = false
  isTaskRunning.value = false
  selectedTask.value = null
  // 保存游戏状态
  saveGameState()
}

// 检查升级
const checkLevelUp = () => {
  while (true) {
    const expNeeded = level.value * 50
    if (resources.value.experience < expNeeded) break
    // 升级逻辑
    resources.value.experience -= expNeeded
    level.value++
    showToast(`恭喜！你升到了${level.value}级`)
    // 升级后恢复体力
    resources.value.energy = 100 + level.value
  }
}

// 保存游戏状态
const saveGameState = () => {
  const gameStateToSave = {
    resources: {
      gold: resources.value.gold, // 金币
      energy: resources.value.energy, // 体力
      experience: resources.value.experience // 经验
    },
    level: level.value, // 等级
    nextEnergyRecovery: nextEnergyRecovery.value, // 下次体力恢复时间
    // 保存当前任务状态
    activeTask: isTaskRunning.value ? {
      taskId: selectedTask.value.id,
      progress: taskProgress.value,
      startTime: Date.now(),
      taskData: JSON.parse(JSON.stringify(selectedTask.value))
    } : null
  }
  gameStore.saveGameState(gameStateToSave)
}

// 加载游戏状态
const loadGameState = async () => {
  const savedState = await gameStore.loadGameState()
  if (savedState) {
    resources.value = savedState.resources
    level.value = savedState.level
    nextEnergyRecovery.value = savedState.nextEnergyRecovery
    // 恢复任务状态
    if (savedState.activeTask) {
      const activeTask = savedState.activeTask
      // 找到对应的任务
      const task = tasks.value.find(t => t.id === activeTask.taskId)
      if (task) {
        // 恢复任务状态
        selectedTask.value = task
        taskProgress.value = activeTask.progress
        isTaskRunning.value = true
        task.loading = true
        // 如果任务进度未完成，继续执行任务
        if (taskProgress.value < 100 && gameWorker) {
          // 计算剩余时间
          const actualDuration = calculateTaskDuration(task)
          const elapsedTime = activeTask.progress / 100 * actualDuration
          const remainingTime = actualDuration - elapsedTime
          // 通过Worker继续执行任务
          gameWorker.postMessage({
            type: 'START_TASK',
            data: {
              taskId: task.id,
              duration: remainingTime,
              initialProgress: activeTask.progress
            }
          })
        } else if (taskProgress.value >= 100) {
          // 如果任务已完成但未处理，立即完成任务
          completeTask()
        }
      }
    }
  }
}

// 初始化体力恢复系统
const initEnergyRecovery = () => {
  // 获取体力恢复速率（从技能系统）
  let recoveryInterval = 60000
  let recoveryAmount = 1
  try {
    const regenRate = skillStore.getEnergyRegenerationRate() // 获取实际恢复速率（默认1点/分钟）
    recoveryInterval = 60000 / regenRate // 根据实际恢复速率调整间隔
    recoveryAmount = Math.floor(regenRate) // 处理技能加速
  } catch (error) {
    console.error('技能系统加载失败，使用默认恢复速率')
  }
  // 处理离线期间的体力恢复
  if (!nextEnergyRecovery.value || nextEnergyRecovery.value <= Date.now()) nextEnergyRecovery.value = Date.now() + recoveryInterval
  if (nextEnergyRecovery.value) {
    const elapsedTime = Date.now() - nextEnergyRecovery.value
    if (elapsedTime > 0) {
      const recoveryCount = Math.floor(elapsedTime / recoveryInterval) + 1
      const newEnergy = Math.min(100 + level.value, resources.value.energy + (recoveryAmount * recoveryCount))
      const energyDiff = newEnergy - resources.value.energy
      if (energyDiff > 0) {
        resources.value.energy = newEnergy
        nextEnergyRecovery.value += recoveryCount * recoveryInterval
        saveGameState()
      }
    }
  }
  // 添加时间计算逻辑
  const initialDelay = Math.max(0, nextEnergyRecovery.value ?
    nextEnergyRecovery.value - Date.now() :
    recoveryInterval
  )
  // 设置恢复定时器...
  energyTimer.value = setTimeout(() => {
    if (resources.value.energy < (100 + level.value)) {
      resources.value.energy = Math.min(100 + level.value, resources.value.energy + recoveryAmount)
      nextEnergyRecovery.value = Date.now() + recoveryInterval
      saveGameState()
    }
    energyTimer.value = setInterval(() => {
      if (resources.value.energy < (100 + level.value)) {
        resources.value.energy = Math.min(100 + level.value, resources.value.energy + recoveryAmount)
        nextEnergyRecovery.value = Date.now() + recoveryInterval
        saveGameState()
      } else {
        clearInterval(energyTimer.value)
      }
    }, recoveryInterval)
  }, initialDelay) // 使用计算后的延迟时间
}

const name = (level) => {
  if (level >= 1 && level < 5) return '村民'
  if (level >= 5 && level < 10) return '冒险者'
  if (level >= 10 && level < 20) return '怪物猎人'
  if (level >= 20 && level < 40) return '奇异旅人'
  if (level >= 40 && level < 60) return '公主护卫'
  if (level >= 60 && level < 80) return '王国使者'
  if (level >= 80 && level < 100) return '囚徒'
  if (level >= 100 && level < 120) return '王国叛逆者'
  if (level >= 120 && level < 200) return '真相追寻者'
  if (level >= 200) return '国王'
}

// 生命周期钩子
onMounted(async () => {
  initTasks()
  initWorker()
  await loadGameState()
  // 确保所有相关 store 都正确初始化
  await Promise.all([
    shopStore.initialize(),
    skillStore.loadSkills(),
    dailyTaskStore.initialize(),
    notificationStore.initialize(),
    useEventStore().initialize(), // 事件系统初始化
    usePetStore().initialize(),   // 宠物系统初始化
    useAchievementStore().initialize() // 成就系统初始化
  ])
  initEnergyRecovery()
})

// 添加页面激活时的处理
onActivated(() => {
  // 重新加载游戏状态，确保数据是最新的
  loadGameState()
  // 如果Worker被销毁，重新初始化
  if (!gameWorker) {
    initWorker()
  }
})

onUnmounted(() => {
  // 清理 Worker
  if (gameWorker) {
    gameWorker.terminate()
    gameWorker = null
  }
  // 清理体力恢复计时器
  if (energyTimer.value) {
    clearInterval(energyTimer.value)
    energyTimer.value = null
  }
  // 保存游戏状态
  saveGameState()
})
</script>

<template>
  <div class="game-container">
    <div class="game-header">
      <div class="resource-panel">
        <div class="resource">
          <span class="resource-label">称号</span>
          <span class="resource-value">{{ name(level) }}</span>
        </div>
        <div class="resource">
          <span class="resource-label">金币</span>
          <span class="resource-value">{{ resources.gold }}</span>
        </div>
        <div class="resource">
          <span class="resource-label">体力</span>
          <span class="resource-value">{{ resources.energy }}</span>
          <van-count-down v-if="resources.energy < 100" class="resource-recovery" @finish="initEnergyRecovery"
            :time="Math.max(1000, nextEnergyRecovery - Date.now())"
            :format="`ss秒后+${skillStore.getEnergyRegenerationRate()}`" />
        </div>
        <div class="resource">
          <span class="resource-label">等级</span>
          <span class="resource-value">{{ level }}</span>
        </div>
      </div>
      <div class="exp-progress">
        <span class="exp-label">经验: {{ resources.experience }}/{{ level * 50 }}</span>
        <van-progress :percentage="Math.min(100, Math.floor((resources.experience / (level * 50)) * 100))"
          :show-pivot="false" color="#2db7f5" />
      </div>
      <div class="game-nav">
        <van-button icon="setting-o" size="small" to="setting">设置</van-button>
        <van-button icon="shop-o" size="small" to="shop">商店</van-button>
        <van-button icon="award" size="small" to="achievements">成就</van-button>
        <van-button icon="upgrade" size="small" to="skills">技能</van-button>
        <van-button icon="calendar-o" size="small" to="daily-tasks">任务</van-button>
        <van-button icon="comment-o" size="small" to="notifications">
          通知
          <van-badge :content="notificationStore.unreadCount" v-if="notificationStore.unreadCount > 0" />
        </van-button>
        <van-button icon="friends-o" size="small" to="pets">宠物</van-button>
        <van-button icon="guide-o" size="small" to="exploration">探索</van-button>
        <van-button icon="gem-o" size="small" to="equipment">装备</van-button>
      </div>
    </div>
    <div class="game-content">
      <div v-if="isTaskRunning" class="task-progress">
        <h3>正在执行: {{ selectedTask.name }}</h3>
        <van-progress :percentage="taskProgress" :pivot-text="`${taskProgress}%`" color="#7232dd" />
      </div>
      <div class="task-list">
        <van-cell-group inset>
          <van-cell v-for="task in tasks" :key="task.id" :title="task.name"
            :label="`等级要求: ${task.minLevel}级 | 奖励: ${calculateReward(task).gold}金币, ${calculateReward(task).experience}经验 | 消耗: ${calculateEnergyCost(task)}体力`"
            :disabled="isTaskRunning">
            <template #right-icon>
              <van-button size="small" type="primary" @click="startTask(task)" :loading="task.loading"
                :disabled="isTaskRunning || resources.energy < calculateEnergyCost(task) || task.minLevel > level">
                开始
              </van-button>
            </template>
          </van-cell>
        </van-cell-group>
      </div>
    </div>
  </div>
</template>

<style scoped>
.game-container {
  display: flex;
  flex-direction: column;
  padding: 16px;
}

.game-header {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 24px;
}

.game-nav {
  display: flex;
  gap: 5px;
  margin-top: 8px;
  flex-wrap: wrap;
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

/* 添加体力恢复倒计时样式 */
.resource-recovery {
  font-size: 0.7rem;
  color: #07c160;
  margin-top: 2px;
}

/* 添加经验值进度条样式 */
.exp-progress {
  background-color: var(--van-cell-background);
  padding: 10px;
  border-radius: 8px;
  margin-top: 8px;
}

.exp-label {
  display: block;
  font-size: 0.8rem;
  color: #646566;
  margin-bottom: 4px;
}

.game-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.task-progress {
  background-color: var(--van-cell-background);
  padding: 16px;
  border-radius: 8px;
}

.task-list h2 {
  margin-bottom: 12px;
}
</style>