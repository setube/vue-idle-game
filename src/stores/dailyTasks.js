import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useGameStore } from './game'
import { useAchievementStore } from './achievements'
import { openDB } from '../utils/indexedDB'

export const useDailyTaskStore = defineStore('dailyTasks', () => {
  // 游戏状态存储
  const gameStore = useGameStore()
  const achievementStore = useAchievementStore()
  // 每日任务列表
  const dailyTasks = ref([])
  // 任务模板列表 - 用于生成每日任务
  const taskTemplates = [
    {
      id: 'daily_gold',
      name: '收集金币',
      description: '今日收集{target}金币',
      type: 'gold_collect',
      minLevel: 1,
      baseTarget: 50, // 基础目标值
      targetMultiplier: 1.5, // 目标值随等级增长的倍数
      reward: { gold: 30, experience: 15 },
      rewardMultiplier: 1.2 // 奖励随等级增长的倍数
    },
    {
      id: 'daily_tasks',
      name: '完成任务',
      description: '今日完成{target}个任务',
      type: 'complete_tasks',
      minLevel: 1,
      baseTarget: 3,
      targetMultiplier: 1.2,
      reward: { gold: 25, experience: 20 },
      rewardMultiplier: 1.2
    },
    {
      id: 'daily_energy',
      name: '消耗体力',
      description: '今日消耗{target}点体力',
      type: 'spend_energy',
      minLevel: 2,
      baseTarget: 30,
      targetMultiplier: 1.3,
      reward: { gold: 20, experience: 25 },
      rewardMultiplier: 1.2
    },
    {
      id: 'daily_mining',
      name: '采集资源',
      description: '今日完成{target}次采集资源任务',
      type: 'specific_task',
      taskId: 1,
      minLevel: 1,
      baseTarget: 2,
      targetMultiplier: 1.2,
      reward: { gold: 15, experience: 10 },
      rewardMultiplier: 1.2
    },
    {
      id: 'daily_explore',
      name: '探索地图',
      description: '今日完成{target}次探索地图任务',
      type: 'specific_task',
      taskId: 2,
      minLevel: 5,
      baseTarget: 2,
      targetMultiplier: 1.2,
      reward: { gold: 30, experience: 20 },
      rewardMultiplier: 1.2
    },
    {
      id: 'daily_combat',
      name: '击败怪物',
      description: '今日完成{target}次击败怪物任务',
      type: 'specific_task',
      taskId: 3,
      minLevel: 10,
      baseTarget: 1,
      targetMultiplier: 1.2,
      reward: { gold: 50, experience: 30 },
      rewardMultiplier: 1.2
    }
  ]
  // 上次刷新时间
  const lastRefreshTime = ref(0)
  // 数据库名称和版本
  const DB_NAME = gameStore.DB_NAME
  const DB_VERSION = gameStore.DB_VERSION
  // 获取未完成的每日任务
  const pendingDailyTasks = computed(() => {
    return dailyTasks.value.filter(task => !task.completed)
  })
  // 获取已完成的每日任务
  const completedDailyTasks = computed(() => {
    return dailyTasks.value.filter(task => task.completed)
  })
  // 初始化每日任务系统
  const initialize = async () => {
    await loadDailyTasks()
    // 检查是否需要刷新每日任务
    if (shouldRefreshDailyTasks()) {
      await generateDailyTasks()
    }
  }
  // 检查是否需要刷新每日任务
  const shouldRefreshDailyTasks = () => {
    if (dailyTasks.value.length === 0) return true
    const now = new Date()
    const lastRefresh = new Date(lastRefreshTime.value)
    // 检查是否过了一个小时（UTC时间）
    return now.getUTCHours() !== lastRefresh.getUTCHours() ||
      now.getUTCDate() !== lastRefresh.getUTCDate() ||
      now.getUTCMonth() !== lastRefresh.getUTCMonth() ||
      now.getUTCFullYear() !== lastRefresh.getUTCFullYear()
  }
  // 生成每日任务
  const generateDailyTasks = async () => {
    // 获取当前游戏状态
    const gameState = await gameStore.loadGameState()
    if (!gameState) return
    const playerLevel = gameState.level || 1
    const now = new Date()
    // 清空当前任务
    dailyTasks.value = []
    // 根据玩家等级筛选可用任务模板
    const availableTemplates = taskTemplates.filter(template => template.minLevel <= playerLevel)

    // 随机选择3个任务
    const selectedTemplates = getRandomTasks(availableTemplates, 3)

    // 生成新任务
    selectedTemplates.forEach(template => {
      // 根据玩家等级计算目标值
      const targetMultiplier = Math.max(1, (playerLevel - template.minLevel) / 5 + 1)
      const target = Math.ceil(template.baseTarget * targetMultiplier)
      // 根据玩家等级计算奖励
      const rewardMultiplier = Math.max(1, (playerLevel - template.minLevel) / 10 + 1)
      const reward = {
        gold: Math.ceil(template.reward.gold * rewardMultiplier),
        experience: Math.ceil(template.reward.experience * rewardMultiplier)
      }
      // 创建任务对象
      const task = {
        id: `${template.id}_${now.getTime()}`,
        templateId: template.id,
        name: template.name,
        description: template.description.replace('{target}', target),
        type: template.type,
        taskId: template.taskId, // 仅特定任务类型有此字段
        target: target,
        progress: 0,
        reward: reward,
        completed: false,
        claimed: false
      }
      dailyTasks.value.push(task)
    })
    // 更新刷新时间
    lastRefreshTime.value = now.getTime()
    // 保存到数据库
    await saveDailyTasks()
    return dailyTasks.value
  }

  // 随机选择指定数量的任务
  const getRandomTasks = (tasks, count) => {
    const shuffled = [...tasks].sort(() => 0.5 - Math.random())
    return shuffled.slice(0, Math.min(count, shuffled.length))
  }

  // 更新任务进度
  const updateTaskProgress = async (type, value, taskId = null) => {
    let updated = false
    dailyTasks.value.forEach(task => {
      if (task.completed) return
      // 根据任务类型更新进度
      if (
        (task.type === 'gold_collect' && type === 'gold') ||
        (task.type === 'complete_tasks' && type === 'tasks_completed') ||
        (task.type === 'spend_energy' && type === 'energy_spent') ||
        (task.type === 'specific_task' && type === 'tasks_completed' && task.taskId === taskId)
      ) {
        task.progress += value
        updated = true
        // 检查任务是否完成
        if (task.progress >= task.target) task.completed = true
      }
    })
    // 如果有更新，保存到数据库
    if (updated) await saveDailyTasks()
    return updated
  }

  // 领取任务奖励
  const claimTaskReward = async (taskId) => {
    const task = dailyTasks.value.find(t => t.id === taskId)
    if (!task) return { success: false, message: '任务不存在' }
    if (!task.completed) return { success: false, message: '任务未完成' }
    if (task.claimed) return { success: false, message: '奖励已领取' }
    // 获取当前游戏状态
    const gameState = await gameStore.loadGameState()
    if (!gameState) return { success: false, message: '无法加载游戏状态' }
    // 更新游戏资源
    const updatedResources = {
      ...gameState.resources,
      gold: gameState.resources.gold + task.reward.gold,
      experience: gameState.resources.experience + task.reward.experience
    }
    // 保存游戏状态
    await gameStore.saveGameState({
      ...gameState,
      resources: updatedResources
    })
    // 更新成就统计
    try {
      // 更新金币获取统计
      achievementStore.updateStats('gold', task.reward.gold)
    } catch (error) {
      console.error('成就系统未加载或更新失败', error)
    }
    // 标记任务奖励已领取
    task.claimed = true
    await saveDailyTasks()
    return {
      success: true,
      message: `已领取奖励：${task.reward.gold}金币，${task.reward.experience}经验`,
      reward: task.reward
    }
  }

  // 保存每日任务到数据库
  const saveDailyTasks = async () => {
    try {
      const db = await openDB(DB_NAME, DB_VERSION)
      // 准备要保存的数据，使用JSON序列化和解析进行深拷贝，确保数据可序列化
      const dataToSave = {
        id: 'dailyTasks',
        tasks: JSON.parse(JSON.stringify(dailyTasks.value)),
        lastRefreshTime: lastRefreshTime.value,
        lastUpdated: new Date().getTime()
      }
      // 保存到数据库
      const tx = db.transaction('dailyTasks', 'readwrite')
      tx.objectStore('dailyTasks').put(dataToSave)
      await tx.done
      return true
    } catch (error) {
      console.error('保存每日任务失败:', error)
      return false
    }
  }

  // 从数据库加载每日任务
  const loadDailyTasks = async () => {
    try {
      const db = await openDB(DB_NAME, DB_VERSION, (db, oldVersion) => {
        // 如果不存在dailyTasks存储，创建它
        if (!db.objectStoreNames.contains('dailyTasks')) db.createObjectStore('dailyTasks', { keyPath: 'id' })
      })
      // 从数据库加载
      const data = await db.get('dailyTasks', 'dailyTasks')
      if (data) {
        dailyTasks.value = data.tasks
        lastRefreshTime.value = data.lastRefreshTime
        return data
      }
      return null
    } catch (error) {
      console.error('加载每日任务失败:', error)
      return null
    }
  }

  // 重置每日任务（用于测试）
  const resetDailyTasks = async () => {
    dailyTasks.value = []
    lastRefreshTime.value = 0
    await saveDailyTasks()
    return true
  }

  return {
    dailyTasks,
    pendingDailyTasks,
    completedDailyTasks,
    lastRefreshTime,
    initialize,
    updateTaskProgress,
    claimTaskReward,
    generateDailyTasks,
    resetDailyTasks
  }
})