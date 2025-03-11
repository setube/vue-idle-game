import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useGameStore } from './game'
import { openDB } from '../utils/indexedDB'

export const useEventStore = defineStore('events', () => {
  // 游戏状态存储
  const gameStore = useGameStore()
  // 随机事件列表
  const events = ref([
    {
      id: 'gold_rush',
      name: '淘金热',
      description: '你发现了一处金矿！获得额外的金币奖励。',
      type: 'positive',
      effect: { type: 'resource', resource: 'gold', value: 50 },
      weight: 10,
      minLevel: 1,
      icon: 'gold-coin'
    },
    {
      id: 'energy_boost',
      name: '精力充沛',
      description: '你感到精力充沛，恢复一些体力。',
      type: 'positive',
      effect: { type: 'resource', resource: 'energy', value: 20 },
      weight: 10,
      minLevel: 1,
      icon: 'fire'
    },
    {
      id: 'exp_bonus',
      name: '顿悟',
      description: '你突然领悟到了一些道理，获得额外经验。',
      type: 'positive',
      effect: { type: 'resource', resource: 'experience', value: 30 },
      weight: 10,
      minLevel: 1,
      icon: 'bulb-o'
    },
    {
      id: 'task_speedup',
      name: '效率提升',
      description: '你的工作效率提高了，下一个任务完成速度加快50%。',
      type: 'positive',
      effect: { type: 'task_speed', value: 0.5 },
      weight: 8,
      minLevel: 2,
      icon: 'clock-o'
    },
    {
      id: 'double_reward',
      name: '双倍奖励',
      description: '你的下一个任务将获得双倍奖励。',
      type: 'positive',
      effect: { type: 'reward_multiplier', value: 2 },
      weight: 5,
      minLevel: 3,
      icon: 'gift-o'
    },
    {
      id: 'energy_drain',
      name: '精力不足',
      description: '你感到疲惫，失去一些体力。',
      type: 'negative',
      effect: { type: 'resource', resource: 'energy', value: -10 },
      weight: 8,
      minLevel: 2,
      icon: 'warning-o'
    },
    {
      id: 'gold_loss',
      name: '意外支出',
      description: '你遇到了一些意外支出，失去一些金币。',
      type: 'negative',
      effect: { type: 'resource', resource: 'gold', value: -20 },
      weight: 8,
      minLevel: 2,
      icon: 'cross'
    },
    {
      id: 'task_slowdown',
      name: '效率降低',
      description: '你的工作效率降低了，下一个任务完成速度减慢30%。',
      type: 'negative',
      effect: { type: 'task_speed', value: -0.3 },
      weight: 6,
      minLevel: 3,
      icon: 'clock-o'
    }
  ])

  // 当前激活的事件
  const activeEvents = ref([])

  // 事件历史记录
  const eventHistory = ref([])

  // 数据库名称和版本
  const DB_NAME = gameStore.DB_NAME
  const DB_VERSION = gameStore.DB_VERSION

  // 获取可能触发的事件（基于玩家等级）
  const availableEvents = computed(() => {
    const gameState = gameStore.gameState
    if (!gameState) return []
    const playerLevel = gameState.level || 1
    return events.value.filter(event => event.minLevel <= playerLevel)
  })

  // 获取正面事件
  const positiveEvents = computed(() => {
    return availableEvents.value.filter(event => event.type === 'positive')
  })

  // 获取负面事件
  const negativeEvents = computed(() => {
    return availableEvents.value.filter(event => event.type === 'negative')
  })

  // 随机触发事件
  const triggerRandomEvent = () => {
    // 确保有可用事件
    if (availableEvents.value.length === 0) return null
    // 计算总权重
    const totalWeight = availableEvents.value.reduce((sum, event) => sum + event.weight, 0)
    // 随机选择一个事件
    let randomValue = Math.random() * totalWeight
    let selectedEvent = null
    for (const event of availableEvents.value) {
      randomValue -= event.weight
      if (randomValue <= 0) {
        selectedEvent = { ...event }
        break
      }
    }
    // 如果选择了事件，添加到激活事件列表和历史记录
    if (selectedEvent) {
      // 添加时间戳
      selectedEvent.timestamp = new Date().getTime()
      // 添加到激活事件列表
      activeEvents.value.push(selectedEvent)
      // 添加到历史记录
      eventHistory.value.push(selectedEvent)
      // 限制历史记录长度
      if (eventHistory.value.length > 50) eventHistory.value.shift()
      // 保存事件数据
      saveEventData()
      // 发送通知
      try {
        notificationStore.createEventNotification(selectedEvent)
      } catch (error) {
        console.error('发送事件通知失败:', error)
      }
      return selectedEvent
    }
    return null
  }

  // 应用事件效果
  const applyEventEffect = async (eventId) => {
    // 查找激活的事件
    const eventIndex = activeEvents.value.findIndex(e => e.id === eventId)
    if (eventIndex === -1) return { success: false, message: '事件不存在或已过期' }
    const event = activeEvents.value[eventIndex]
    // 获取当前游戏状态
    const gameState = await gameStore.loadGameState()
    if (!gameState) return { success: false, message: '无法加载游戏状态' }
    // 应用效果
    let effectResult = { description: '' }
    switch (event.effect.type) {
      case 'resource':
        const resource = event.effect.resource
        const value = event.effect.value
        if (resource === 'gold') {
          gameState.resources.gold = Math.max(0, gameState.resources.gold + value)
          effectResult.description = `${value > 0 ? '获得' : '失去'}了 ${Math.abs(value)} 金币`
        } else if (resource === 'energy') {
          gameState.resources.energy = Math.max(0, Math.min(100, gameState.resources.energy + value))
          effectResult.description = `${value > 0 ? '恢复' : '失去'}了 ${Math.abs(value)} 体力`
        } else if (resource === 'experience') {
          gameState.resources.experience = Math.max(0, gameState.resources.experience + value)
          effectResult.description = `${value > 0 ? '获得' : '失去'}了 ${Math.abs(value)} 经验`
        }
        break
      case 'task_speed':
      case 'reward_multiplier':
        // 这些效果会在任务执行时应用
        effectResult.description = '效果已激活，将在下次任务中生效'
        break
    }

    // 保存游戏状态
    await gameStore.saveGameState(gameState)
    // 从激活事件列表中移除
    activeEvents.value.splice(eventIndex, 1)
    // 保存事件数据
    saveEventData()
    return {
      success: true,
      message: `事件效果已应用: ${effectResult.description}`,
      effect: effectResult
    }
  }

  // 获取任务速度修饰符
  const getTaskSpeedModifier = () => {
    let modifier = 0
    activeEvents.value.forEach(event => {
      if (event.effect.type === 'task_speed') modifier += event.effect.value
    })
    // 确保任务速度不会变为负数
    return Math.max(0.1, 1 + modifier)
  }
  // 获取奖励倍数修饰符
  const getRewardMultiplier = () => {
    let multiplier = 1
    activeEvents.value.forEach(event => {
      if (event.effect.type === 'reward_multiplier') multiplier *= event.effect.value
    })
    return multiplier
  }

  // 消耗一个速度或奖励倍数效果
  const consumeTaskEffect = (effectType) => {
    const index = activeEvents.value.findIndex(event => event.effect.type === effectType)
    if (index !== -1) {
      // 移除效果
      activeEvents.value.splice(index, 1)
      // 保存事件数据
      saveEventData()
      return true
    }
    return false
  }

  // 保存事件数据
  const saveEventData = async () => {
    try {
      const db = await openDB(DB_NAME, DB_VERSION, (db, oldVersion) => {
        // 数据库升级处理
        // 创建事件存储
        if (oldVersion < 3 && !db.objectStoreNames.contains('events')) db.createObjectStore('events', { keyPath: 'id' })
      })
      // 保存到数据库
      const tx = db.transaction('events', 'readwrite')
      // 保存激活事件
      tx.objectStore('events').put({
        id: 'activeEvents',
        events: activeEvents.value,
        lastUpdated: new Date().getTime()
      })
      // 保存事件历史
      tx.objectStore('events').put({
        id: 'eventHistory',
        events: eventHistory.value,
        lastUpdated: new Date().getTime()
      })
      await tx.done
      return true
    } catch (error) {
      console.error('保存事件数据失败:', error)
      return false
    }
  }

  // 加载事件数据
  const loadEventData = async () => {
    try {
      const db = await openDB(DB_NAME, DB_VERSION, (db, oldVersion) => {
        // 数据库升级处理
        // 创建事件存储
        if (oldVersion < 3 && !db.objectStoreNames.contains('events')) db.createObjectStore('events', { keyPath: 'id' })
      })
      // 从数据库加载
      const activeEventsData = await db.get('events', 'activeEvents')
      const eventHistoryData = await db.get('events', 'eventHistory')
      if (activeEventsData && activeEventsData.events) activeEvents.value = activeEventsData.events
      if (eventHistoryData && eventHistoryData.events) eventHistory.value = eventHistoryData.events
      return true
    } catch (error) {
      console.error('加载事件数据失败:', error)
      return false
    }
  }

  // 初始化
  const initialize = async () => {
    await loadEventData()
  }

  return {
    events,
    activeEvents,
    eventHistory,
    availableEvents,
    positiveEvents,
    negativeEvents,
    triggerRandomEvent,
    applyEventEffect,
    getTaskSpeedModifier,
    getRewardMultiplier,
    consumeTaskEffect,
    initialize
  }
})