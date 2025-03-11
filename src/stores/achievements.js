import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useGameStore } from './game'
import { openDB } from '../utils/indexedDB'
import { useNotificationStore } from '../stores/notifications'

export const useAchievementStore = defineStore('achievements', () => {
  // 游戏状态存储
  const gameStore = useGameStore()
  const notificationStore = useNotificationStore()
  // 成就列表
  const achievements = ref([
    {
      id: 'first_gold',
      name: '初次收获',
      description: '累计获得100金币',
      requirement: { type: 'gold', value: 100 },
      reward: { gold: 50, experience: 20 },
      completed: false,
      icon: 'gold-coin'
    },
    {
      id: 'energy_master',
      name: '精力充沛',
      description: '累计消耗500点体力',
      requirement: { type: 'energy_spent', value: 500 },
      reward: { gold: 100, experience: 50 },
      completed: false,
      icon: 'fire'
    },
    {
      id: 'task_novice',
      name: '任务新手',
      description: '完成10个任务',
      requirement: { type: 'tasks_completed', value: 10 },
      reward: { gold: 150, experience: 75 },
      completed: false,
      icon: 'checked'
    },
    {
      id: 'level_up',
      name: '成长之路',
      description: '达到5级',
      requirement: { type: 'level', value: 5 },
      reward: { gold: 200, experience: 100 },
      completed: false,
      icon: 'upgrade'
    },
    {
      id: 'explorer',
      name: '探索者',
      description: '完成20次探索地图任务',
      requirement: { type: 'task_specific', taskId: 2, count: 20 },
      reward: { gold: 250, experience: 125 },
      completed: false,
      icon: 'location'
    }
  ])

  // 玩家成就统计数据
  const stats = ref({
    gold_earned: 0,
    energy_spent: 0,
    tasks_completed: 0,
    task_specific_counts: {}
  })
  // 数据库名称和版本
  const DB_NAME = gameStore.DB_NAME
  const DB_VERSION = gameStore.DB_VERSION
  // 获取未完成的成就
  const pendingAchievements = computed(() => {
    return achievements.value.filter(achievement => !achievement.completed)
  })
  // 获取已完成的成就
  const completedAchievements = computed(() => {
    return achievements.value.filter(achievement => achievement.completed)
  })
  // 更新统计数据
  const updateStats = (type, value, taskId = null) => {
    switch (type) {
      case 'gold':
        stats.value.gold_earned += value
        break
      case 'energy_spent':
        stats.value.energy_spent += value
        break
      case 'tasks_completed':
        stats.value.tasks_completed += 1
        // 更新特定任务的完成次数
        if (taskId) {
          if (!stats.value.task_specific_counts[taskId]) stats.value.task_specific_counts[taskId] = 0
          stats.value.task_specific_counts[taskId] += 1
        }
        break
    }
    // 检查成就完成情况
    checkAchievements()
    // 保存统计数据
    saveStats()
  }

  // 检查成就完成情况
  const checkAchievements = async () => {
    let newlyCompleted = false
    for (const achievement of achievements.value) {
      if (achievement.completed) continue
      let completed = false
      switch (achievement.requirement.type) {
        case 'gold':
          completed = stats.value.gold_earned >= achievement.requirement.value
          break
        case 'energy_spent':
          completed = stats.value.energy_spent >= achievement.requirement.value
          break
        case 'tasks_completed':
          completed = stats.value.tasks_completed >= achievement.requirement.value
          break
        case 'level':
          const gameState = gameStore.gameState
          completed = gameState && gameState.level >= achievement.requirement.value
          break
        case 'task_specific':
          const taskCount = stats.value.task_specific_counts[achievement.requirement.taskId] || 0
          completed = taskCount >= achievement.requirement.count
          break
      }
      if (completed) {
        achievement.completed = true
        newlyCompleted = true
        // 发送通知
        try {
          await notificationStore.createAchievementNotification(achievement)
        } catch (error) {
          console.error('发送成就通知失败:', error)
        }
      }
    }
    if (newlyCompleted) saveAchievements()
    return newlyCompleted
  }

  // 领取成就奖励
  const claimAchievementReward = async (achievementId) => {
    const achievement = achievements.value.find(a => a.id === achievementId)
    if (!achievement || !achievement.completed) return { success: false, message: '成就未完成' }
    // 获取当前游戏状态
    const gameState = await gameStore.loadGameState()
    if (!gameState) return { success: false, message: '无法加载游戏状态' }
    // 添加奖励
    gameState.resources.gold += achievement.reward.gold
    gameState.resources.experience += achievement.reward.experience
    // 保存游戏状态
    await gameStore.saveGameState(gameState)
    // 标记成就奖励已领取
    achievement.rewardClaimed = true
    saveAchievements()
    return {
      success: true,
      message: '成就奖励已领取',
      reward: achievement.reward
    }
  }

  // 保存成就数据
  const saveAchievements = async () => {
    try {
      const db = await openDB(DB_NAME, DB_VERSION, (db, oldVersion) => {
        // 数据库升级处理
        // 创建成就存储
        if (oldVersion < 3 && !db.objectStoreNames.contains('achievements')) db.createObjectStore('achievements', { keyPath: 'id' })
      })
      // 创建纯数据对象的深拷贝，确保可以被序列化
      const achievementsClone = JSON.parse(JSON.stringify(achievements.value))
      // 保存到数据库
      const tx = db.transaction('achievements', 'readwrite')
      tx.objectStore('achievements').put({
        id: 'achievements',
        list: achievementsClone,
        lastUpdated: new Date().getTime()
      })
      await tx.done
      return true
    } catch (error) {
      console.error('保存成就数据失败:', error)
      return false
    }
  }

  // 保存统计数据
  const saveStats = async () => {
    try {
      const db = await openDB(DB_NAME, DB_VERSION, (db, oldVersion) => {
        // 数据库升级处理
        // 创建成就存储
        if (oldVersion < 3 && !db.objectStoreNames.contains('achievements')) db.createObjectStore('achievements', { keyPath: 'id' })
      })
      // 创建纯数据对象的深拷贝，确保可以被序列化
      const statsClone = JSON.parse(JSON.stringify(stats.value))
      // 保存到数据库
      const tx = db.transaction('achievements', 'readwrite')
      tx.objectStore('achievements').put({
        id: 'stats',
        data: statsClone,
        lastUpdated: new Date().getTime()
      })
      await tx.done
      return true
    } catch (error) {
      console.error('保存统计数据失败:', error)
      return false
    }
  }

  // 加载成就数据
  const loadAchievements = async () => {
    try {
      const db = await openDB(DB_NAME, DB_VERSION, (db, oldVersion) => {
        // 数据库升级处理
        // 创建成就存储
        if (oldVersion < 3 && !db.objectStoreNames.contains('achievements')) db.createObjectStore('achievements', { keyPath: 'id' })
      })
      // 从数据库加载
      const achievementsData = await db.get('achievements', 'achievements')
      if (achievementsData && achievementsData.list) {
        // 更新本地状态，但保留默认成就的结构
        const savedAchievements = achievementsData.list
        // 合并保存的成就状态到默认成就列表
        achievements.value = achievements.value.map(defaultAchievement => {
          const savedAchievement = savedAchievements.find(a => a.id === defaultAchievement.id)
          return savedAchievement ? { ...defaultAchievement, ...savedAchievement } : defaultAchievement
        })
        return achievements.value
      }
      return achievements.value
    } catch (error) {
      console.error('加载成就数据失败:', error)
      return achievements.value
    }
  }

  // 加载统计数据
  const loadStats = async () => {
    try {
      const db = await openDB(DB_NAME, DB_VERSION, (db, oldVersion) => {
        // 数据库升级处理
        // 创建成就存储
        if (oldVersion < 3 && !db.objectStoreNames.contains('achievements')) db.createObjectStore('achievements', { keyPath: 'id' })
      })
      // 从数据库加载
      const statsData = await db.get('achievements', 'stats')
      if (statsData && statsData.data) {
        // 更新本地状态
        stats.value = statsData.data
        return stats.value
      }
      return stats.value
    } catch (error) {
      console.error('加载统计数据失败:', error)
      return stats.value
    }
  }

  // 初始化
  const initialize = async () => {
    await loadAchievements()
    await loadStats()
    checkAchievements()
  }

  // 获取当前等级（用于成就进度计算）
  const getCurrentLevel = () => {
    const gameState = gameStore.gameState
    return gameState ? gameState.level : 1
  }

  return {
    achievements,
    stats,
    pendingAchievements,
    completedAchievements,
    updateStats,
    checkAchievements,
    claimAchievementReward,
    initialize,
    loadAchievements,
    loadStats,
    getCurrentLevel
  }
})