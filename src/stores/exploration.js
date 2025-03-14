import { defineStore } from 'pinia'
import { ref } from 'vue'
import { openDB, initDatabase } from '../utils/indexedDB'
import { useGameStore } from './game'
import { useAchievementStore } from './achievements'
import { useDailyTaskStore } from './dailyTasks'

export const useExplorationStore = defineStore('exploration', () => {
  // 探索区域数据
  const areas = ref([])
  // 当前探索状态
  const explorationState = ref(null)
  // 探索历史记录
  const explorationHistory = ref([])

  // 区域类型
  const AREA_TYPES = {
    FOREST: 'forest',
    MOUNTAIN: 'mountain',
    CAVE: 'cave',
    DESERT: 'desert',
    OCEAN: 'ocean',
    RUINS: 'ruins'
  }

  // 事件类型
  const EVENT_TYPES = {
    BATTLE: 'battle',
    TREASURE: 'treasure',
    PUZZLE: 'puzzle',
    MERCHANT: 'merchant',
    TRAP: 'trap',
    BLESSING: 'blessing'
  }

  // 初始化探索系统
  const initialize = async () => {
    try {
      const gameStore = useGameStore()
      // 使用共享的数据库初始化函数
      const db = await openDB(gameStore.DB_NAME, gameStore.DB_VERSION, (db, oldVersion) => initDatabase(db, oldVersion, gameStore.DB_VERSION))
      // 从数据库加载探索区域
      const savedAreas = await db.getAll('exploration')
      if (savedAreas && savedAreas.length > 0) areas.value = savedAreas
      // 初始化默认探索区域
      else await initializeDefaultAreas()
      // 加载探索状态
      const state = await db.get('exploration', 'state')
      if (state) explorationState.value = state
      // 加载探索历史
      const history = await db.get('exploration', 'history')
      if (history) explorationHistory.value = history.records || []
      return true
    } catch (error) {
      console.error('初始化探索系统失败:', error)
      return false
    }
  }

  // 初始化默认探索区域
  const initializeDefaultAreas = async () => {
    const defaultAreas = [
      {
        id: 1,
        name: '神秘森林',
        type: AREA_TYPES.FOREST,
        description: '一片古老而神秘的森林，传说中隐藏着许多珍贵的资源和神奇的生物。',
        minLevel: 1,
        energyCost: 15,
        duration: 8000,
        baseRewards: {
          gold: { min: 10, max: 30 },
          experience: { min: 5, max: 15 }
        },
        events: [
          { type: EVENT_TYPES.BATTLE, chance: 0.3, difficulty: 1 },
          { type: EVENT_TYPES.TREASURE, chance: 0.2, quality: 1 },
          { type: EVENT_TYPES.BLESSING, chance: 0.1, power: 1 }
        ],
        itemDrops: [
          { id: 'wood_stick', name: '木棍', type: 'weapon', chance: 0.3, stats: { attack: 2 } },
          { id: 'leaf_hat', name: '树叶帽', type: 'helmet', chance: 0.2, stats: { defense: 1 } }
        ],
        unlocked: true
      },
      {
        id: 2,
        name: '荒芜山脉',
        type: AREA_TYPES.MOUNTAIN,
        description: '陡峭的山脉地带，充满了危险的悬崖和珍贵的矿物资源。',
        minLevel: 10,
        energyCost: 25,
        duration: 12000,
        baseRewards: {
          gold: { min: 25, max: 60 },
          experience: { min: 15, max: 35 }
        },
        events: [
          { type: EVENT_TYPES.BATTLE, chance: 0.35, difficulty: 2 },
          { type: EVENT_TYPES.TREASURE, chance: 0.25, quality: 2 },
          { type: EVENT_TYPES.TRAP, chance: 0.15, damage: 10 }
        ],
        itemDrops: [
          { id: 'stone_axe', name: '石斧', type: 'weapon', chance: 0.25, stats: { attack: 5 } },
          { id: 'iron_ore', name: '铁矿石', type: 'material', chance: 0.4, value: 15 }
        ],
        unlocked: false
      },
      {
        id: 3,
        name: '幽暗洞穴',
        type: AREA_TYPES.CAVE,
        description: '黑暗而神秘的洞穴系统，据说藏有远古的宝藏和危险的生物。',
        minLevel: 20,
        energyCost: 35,
        duration: 15000,
        baseRewards: {
          gold: { min: 50, max: 100 },
          experience: { min: 30, max: 60 }
        },
        events: [
          { type: EVENT_TYPES.BATTLE, chance: 0.4, difficulty: 3 },
          { type: EVENT_TYPES.TREASURE, chance: 0.3, quality: 3 },
          { type: EVENT_TYPES.PUZZLE, chance: 0.2, difficulty: 2 }
        ],
        itemDrops: [
          { id: 'crystal_shard', name: '水晶碎片', type: 'material', chance: 0.3, value: 30 },
          { id: 'bat_wing', name: '蝙蝠翼', type: 'material', chance: 0.4, value: 20 },
          { id: 'shadow_cloak', name: '暗影斗篷', type: 'armor', chance: 0.15, stats: { defense: 8 } }
        ],
        unlocked: false
      },
      {
        id: 4,
        name: '炙热沙漠',
        type: AREA_TYPES.DESERT,
        description: '一片广阔的沙漠地带，白天炎热干燥，夜晚寒冷刺骨，隐藏着失落的古代文明遗迹。',
        minLevel: 30,
        energyCost: 45,
        duration: 18000,
        baseRewards: {
          gold: { min: 80, max: 150 },
          experience: { min: 50, max: 90 }
        },
        events: [
          { type: EVENT_TYPES.BATTLE, chance: 0.3, difficulty: 4 },
          { type: EVENT_TYPES.MERCHANT, chance: 0.2, quality: 3 },
          { type: EVENT_TYPES.TRAP, chance: 0.25, damage: 20 }
        ],
        itemDrops: [
          { id: 'desert_gem', name: '沙漠宝石', type: 'material', chance: 0.2, value: 50 },
          { id: 'scorpion_tail', name: '蝎子尾', type: 'material', chance: 0.3, value: 35 },
          { id: 'sand_veil', name: '沙之面纱', type: 'accessory', chance: 0.1, stats: { defense: 6, special: '抵抗沙尘暴' } }
        ],
        unlocked: false
      },
      {
        id: 5,
        name: '深海遗迹',
        type: AREA_TYPES.OCEAN,
        description: '沉没在海底的古代文明遗迹，充满了神秘的力量和珍贵的宝藏。',
        minLevel: 50,
        energyCost: 60,
        duration: 25000,
        baseRewards: {
          gold: { min: 120, max: 250 },
          experience: { min: 80, max: 150 }
        },
        events: [
          { type: EVENT_TYPES.BATTLE, chance: 0.35, difficulty: 5 },
          { type: EVENT_TYPES.TREASURE, chance: 0.3, quality: 5 },
          { type: EVENT_TYPES.PUZZLE, chance: 0.25, difficulty: 4 }
        ],
        itemDrops: [
          { id: 'trident', name: '三叉戟', type: 'weapon', chance: 0.15, stats: { attack: 25 } },
          { id: 'pearl', name: '深海珍珠', type: 'material', chance: 0.25, value: 80 },
          { id: 'coral_armor', name: '珊瑚甲', type: 'armor', chance: 0.1, stats: { defense: 20 } }
        ],
        unlocked: false
      },
      {
        id: 6,
        name: '远古废墟',
        type: AREA_TYPES.RUINS,
        description: '一座被遗忘的远古文明废墟，蕴含着强大的魔法能量和无价的宝藏。',
        minLevel: 80,
        energyCost: 80,
        duration: 35000,
        baseRewards: {
          gold: { min: 200, max: 400 },
          experience: { min: 150, max: 300 }
        },
        events: [
          { type: EVENT_TYPES.BATTLE, chance: 0.4, difficulty: 6 },
          { type: EVENT_TYPES.TREASURE, chance: 0.35, quality: 6 },
          { type: EVENT_TYPES.BLESSING, chance: 0.15, power: 3 }
        ],
        itemDrops: [
          { id: 'ancient_sword', name: '远古之剑', type: 'weapon', chance: 0.1, stats: { attack: 40 } },
          { id: 'magic_crystal', name: '魔法水晶', type: 'material', chance: 0.2, value: 120 },
          { id: 'rune_shield', name: '符文盾', type: 'shield', chance: 0.08, stats: { defense: 35 } }
        ],
        unlocked: false
      }
    ]

    // 保存到数据库
    try {
      const gameStore = useGameStore()
      const db = await openDB(gameStore.DB_NAME, gameStore.DB_VERSION)
      const tx = db.transaction('exploration', 'readwrite')
      for (const area of defaultAreas) {
        // 深拷贝
        tx.objectStore('exploration').put(JSON.parse(JSON.stringify(area)))
      }
      await tx.done
      areas.value = defaultAreas
      return true
    } catch (error) {
      console.error('初始化默认探索区域失败:', error)
      return false
    }
  }

  // 获取可用的探索区域
  const getAvailableAreas = (playerLevel) => {
    return areas.value.filter(area => area.minLevel <= playerLevel)
  }

  // 解锁探索区域
  const unlockArea = async (areaId) => {
    try {
      const area = areas.value.find(a => a.id === areaId)
      if (!area) return { success: false, message: '区域不存在' }
      area.unlocked = true
      // 保存到数据库
      const gameStore = useGameStore()
      const db = await openDB(gameStore.DB_NAME, gameStore.DB_VERSION)
      const tx = db.transaction('exploration', 'readwrite')
      // 深拷贝
      const areaCopy = JSON.parse(JSON.stringify(area))
      tx.objectStore('exploration').put(areaCopy)
      await tx.done
      return { success: true, message: `已解锁${area.name}` }
    } catch (error) {
      console.error('解锁探索区域失败:', error)
      return { success: false, message: '解锁失败: ' + error.message }
    }
  }

  // 开始探索
  const startExploration = async (areaId, playerLevel, playerEnergy) => {
    try {
      const area = areas.value.find(a => a.id === areaId)
      if (!area) return { success: false, message: '区域不存在' }
      // 检查区域是否解锁
      if (!area.unlocked) return { success: false, message: '该区域尚未解锁' }
      // 检查等级要求
      if (playerLevel < area.minLevel) return { success: false, message: `需要等级 ${area.minLevel}` }
      // 检查体力是否足够
      if (playerEnergy < area.energyCost) return { success: false, message: `需要 ${area.energyCost} 点体力` }
      // 创建探索状态
      const newExplorationState = {
        id: 'state',
        areaId,
        startTime: Date.now(),
        duration: area.duration,
        status: 'exploring',
        energyCost: area.energyCost,
        area: JSON.parse(JSON.stringify(area)) // 深拷贝
      }
      // 保存到数据库
      const gameStore = useGameStore()
      const db = await openDB(gameStore.DB_NAME, gameStore.DB_VERSION)
      const tx = db.transaction('exploration', 'readwrite')
      tx.objectStore('exploration').put(newExplorationState)
      await tx.done
      explorationState.value = newExplorationState
      return { success: true, message: `开始探索${area.name}`, state: newExplorationState }
    } catch (error) {
      console.error('开始探索失败:', error)
      return { success: false, message: '开始探索失败: ' + error.message }
    }
  }

  // 完成探索
  const completeExploration = async () => {
    try {
      if (!explorationState.value || explorationState.value.status !== 'exploring') return { success: false, message: '没有正在进行的探索' }
      const area = areas.value.find(a => a.id === explorationState.value.areaId)
      if (!area) return { success: false, message: '探索区域不存在' }
      // 计算奖励
      const rewards = calculateRewards(area)
      // 生成探索结果
      const events = generateEvents(area)
      // 生成物品掉落
      const items = generateItemDrops(area)
      // 更新探索状态
      explorationState.value.status = 'completed'
      explorationState.value.completedTime = Date.now()
      explorationState.value.rewards = JSON.parse(JSON.stringify(rewards))
      explorationState.value.events = JSON.parse(JSON.stringify(events))
      explorationState.value.items = JSON.parse(JSON.stringify(items))
      // 保存到数据库
      const gameStore = useGameStore()
      const db = await openDB(gameStore.DB_NAME, gameStore.DB_VERSION)
      const tx = db.transaction('exploration', 'readwrite')
      tx.objectStore('exploration').put(JSON.parse(JSON.stringify(explorationState.value)))
      await tx.done
      // 添加到历史记录
      const historyEntry = {
        id: Date.now(),
        areaId: area.id,
        areaName: area.name,
        completedTime: explorationState.value.completedTime,
        rewards: JSON.parse(JSON.stringify(rewards)),
        events: JSON.parse(JSON.stringify(events)),
        items: JSON.parse(JSON.stringify(items))
      }
      explorationHistory.value.push(historyEntry)
      // 限制历史记录数量
      if (explorationHistory.value.length > 50) explorationHistory.value = explorationHistory.value.slice(-50)
      // 保存历史记录
      const history = {
        id: 'history',
        records: JSON.parse(JSON.stringify(explorationHistory.value))
      }
      tx.objectStore('exploration').put(history)
      await tx.done
      return {
        success: true,
        message: '探索完成',
        rewards,
        events,
        items
      }
    } catch (error) {
      console.error('完成探索失败:', error)
      return { success: false, message: '完成探索失败: ' + error.message }
    }
  }

  // 计算奖励
  const calculateRewards = (area) => {
    const baseRewards = area.baseRewards
    const rewards = {
      gold: Math.floor(Math.random() * (baseRewards.gold.max - baseRewards.gold.min + 1)) + baseRewards.gold.min,
      experience: Math.floor(Math.random() * (baseRewards.experience.max - baseRewards.experience.min + 1)) + baseRewards.experience.min
    }
    return rewards
  }

  // 生成事件
  const generateEvents = (area) => {
    const events = []
    // 遍历区域可能的事件
    for (const eventData of area.events) {
      // 根据概率决定是否触发事件
      if (Math.random() < eventData.chance) {
        const event = { type: eventData.type }
        // 根据事件类型添加特定属性
        switch (eventData.type) {
          case EVENT_TYPES.BATTLE:
            event.difficulty = eventData.difficulty
            event.result = Math.random() < 0.7 ? 'victory' : 'defeat' // 70%胜率
            event.description = event.result === 'victory' ?
              '你成功击败了敌人，获得了额外奖励。' :
              '你在战斗中失败，损失了一些奖励。'
            break
          case EVENT_TYPES.TREASURE:
            event.quality = eventData.quality
            event.description = '你发现了一个宝箱，获得了额外奖励。'
            break
          case EVENT_TYPES.PUZZLE:
            event.difficulty = eventData.difficulty
            event.result = Math.random() < 0.6 ? 'solved' : 'failed' // 60%解谜成功率
            event.description = event.result === 'solved' ?
              '你成功解开了谜题，获得了额外奖励。' :
              '你未能解开谜题，错过了一些奖励。'
            break
          case EVENT_TYPES.MERCHANT:
            event.quality = eventData.quality
            event.description = '你遇到了一位商人，他提供了一些特殊物品。'
            break
          case EVENT_TYPES.TRAP:
            event.damage = eventData.damage
            event.description = `你触发了陷阱，受到了${eventData.damage}点伤害。`
            break
          case EVENT_TYPES.BLESSING:
            event.power = eventData.power
            event.description = '你受到了神秘力量的祝福，获得了额外奖励。'
            break
        }
        events.push(event)
      }
    }
    return events
  }

  // 生成物品掉落
  const generateItemDrops = (area) => {
    const items = []
    // 遍历区域可能的物品掉落
    for (const itemData of area.itemDrops) {
      // 根据概率决定是否掉落物品
      if (Math.random() < itemData.chance) {
        items.push({
          id: itemData.id,
          name: itemData.name,
          type: itemData.type,
          stats: itemData.stats,
          value: itemData.value
        })
      }
    }
    return items
  }

  // 领取探索奖励
  const claimExplorationRewards = async () => {
    try {
      if (!explorationState.value || explorationState.value.status !== 'completed') return { success: false, message: '没有可领取的探索奖励' }
      // 获取游戏状态
      const gameStore = useGameStore()
      const gameState = await gameStore.loadGameState()
      if (!gameState) return { success: false, message: '无法加载游戏状态' }
      // 更新资源
      const rewards = explorationState.value.rewards
      gameState.resources.gold += rewards.gold
      gameState.resources.experience += rewards.experience
      // 检查是否有物品掉落，将物品添加到装备库
      if (explorationState.value.items && explorationState.value.items.length > 0) {
        // 这里需要与装备系统集成
        // 暂时先记录物品掉落信息
      }
      // 保存游戏状态
      await gameStore.saveGameState(gameState)
      // 更新探索状态
      explorationState.value.status = 'claimed'
      // 保存到数据库
      const db = await openDB(gameStore.DB_NAME, gameStore.DB_VERSION)
      const tx = db.transaction('exploration', 'readwrite')
      // 确保对整个对象进行深拷贝，避免不可序列化的内容
      const safeExplorationState = JSON.parse(JSON.stringify(explorationState.value))
      tx.objectStore('exploration').put(safeExplorationState)
      await tx.done
      // 更新成就和每日任务
      try {
        const achievementStore = useAchievementStore()
        const safeAreaId = JSON.parse(JSON.stringify(explorationState.value.areaId))
        achievementStore.updateStats('exploration_completed', 1, safeAreaId)
        achievementStore.updateStats('gold', rewards.gold)
        const dailyTaskStore = useDailyTaskStore()
        dailyTaskStore.updateTaskProgress('exploration_completed', 1)
        dailyTaskStore.updateTaskProgress('gold', rewards.gold)
      } catch (error) {
        console.error('更新成就或每日任务失败:', error)
      }
      return {
        success: true,
        message: '已领取探索奖励',
        rewards: JSON.parse(JSON.stringify(rewards)),
        items: JSON.parse(JSON.stringify(explorationState.value.items))
      }
    } catch (error) {
      console.error('领取探索奖励失败:', error)
      return { success: false, message: '领取探索奖励失败: ' + error.message }
    }
  }

  // 获取探索进度
  const getExplorationProgress = () => {
    if (!explorationState.value || explorationState.value.status !== 'exploring') return 0
    const now = Date.now()
    const elapsed = now - explorationState.value.startTime
    const progress = Math.min(100, Math.floor((elapsed / explorationState.value.duration) * 100))
    return progress
  }

  // 检查探索是否完成
  const checkExplorationComplete = () => {
    if (!explorationState.value || explorationState.value.status !== 'exploring') return false
    const now = Date.now()
    const elapsed = now - explorationState.value.startTime
    return elapsed >= explorationState.value.duration
  }

  return {
    // 状态
    areas,
    explorationState,
    explorationHistory,
    // 常量
    AREA_TYPES,
    EVENT_TYPES,
    // 方法
    initialize,
    getAvailableAreas,
    unlockArea,
    startExploration,
    completeExploration,
    claimExplorationRewards,
    getExplorationProgress,
    checkExplorationComplete
  }
})