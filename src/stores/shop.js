import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useGameStore } from './game'
import { openDB } from '../utils/indexedDB'

export const useShopStore = defineStore('shop', () => {
  // 游戏状态存储
  const gameStore = useGameStore()
  // 商店物品列表
  const items = ref([
    {
      id: 'energy_potion',
      name: '体力药水',
      description: '立即恢复30点体力',
      price: 50,
      effect: { type: 'resource', resource: 'energy', value: 30 },
      icon: 'fire',
      minLevel: 1,
      stock: -1, // -1表示无限库存
      purchased: 0 // 已购买数量
    },
    {
      id: 'energy_potion_max',
      name: '超大体力药水',
      description: '立即恢复100点体力',
      price: 200,
      effect: { type: 'resource', resource: 'energy', value: 100 },
      icon: 'fire',
      minLevel: 50,
      stock: -1, // -1表示无限库存
      purchased: 0 // 已购买数量
    },
    {
      id: 'exp_scroll',
      name: '经验卷轴',
      description: '立即获得50点经验',
      price: 100,
      effect: { type: 'resource', resource: 'experience', value: 50 },
      icon: 'bookmark',
      minLevel: 1,
      stock: -1,
      purchased: 0
    },
    {
      id: 'gold_boost',
      name: '金币加成',
      description: '在10分钟内获得的金币增加20%',
      price: 200,
      effect: { type: 'boost', boostType: 'gold', value: 0.2, duration: 600000 }, // 持续10分钟
      icon: 'gold-coin',
      minLevel: 1,
      stock: -1,
      purchased: 0
    },
    {
      id: 'energy_regen',
      name: '体力恢复加速器',
      description: '在10分钟内体力恢复速度提高50%',
      price: 300,
      effect: { type: 'boost', boostType: 'energy_regen', value: 0.5, duration: 600000 }, // 持续10分钟
      icon: 'replay',
      minLevel: 1,
      stock: -1,
      purchased: 0
    },
    {
      id: 'energy_regen_max',
      name: '超级体力恢复加速器',
      description: '在10分钟内体力恢复速度提高500%',
      price: 3000,
      effect: { type: 'boost', boostType: 'energy_regen', value: 5, duration: 600000 }, // 持续10分钟
      icon: 'replay',
      minLevel: 50,
      stock: -1,
      purchased: 0
    },
    {
      id: 'task_speed',
      name: '任务加速器',
      description: '在10分钟内任务完成速度提高30%',
      price: 250,
      effect: { type: 'boost', boostType: 'task_speed', value: 0.3, duration: 600000 }, // 持续10分钟
      icon: 'clock',
      minLevel: 1,
      stock: -1,
      purchased: 0
    },
    {
      id: 'task_speed_max',
      name: '超级任务加速器',
      description: '在10分钟内任务完成速度提高200%',
      price: 2500,
      effect: { type: 'boost', boostType: 'task_speed', value: 2, duration: 600000 }, // 持续10分钟
      icon: 'clock',
      minLevel: 50,
      stock: -1,
      purchased: 0
    },
    {
      id: 'premium_pickaxe',
      name: '高级镐',
      description: '永久提高采集资源任务的金币获取效率15%',
      price: 500,
      effect: { type: 'permanent', effectType: 'task_boost', taskId: 1, resourceType: 'gold', value: 0.15 },
      icon: 'gem',
      minLevel: 1,
      stock: 1, // 只能购买一次
      purchased: 0
    },
    {
      id: 'explorer_map',
      name: '探险家地图',
      description: '永久提高探索地图任务的经验获取效率15%',
      price: 500,
      effect: { type: 'permanent', effectType: 'task_boost', taskId: 2, resourceType: 'experience', value: 0.15 },
      icon: 'location',
      minLevel: 5,
      stock: 1,
      purchased: 0
    },
    {
      id: 'energy_saver',
      name: '体力节省器',
      description: '永久减少所有任务的体力消耗10%',
      price: 800,
      effect: { type: 'permanent', effectType: 'energy_save', value: 0.1 },
      icon: 'certificate',
      minLevel: 10,
      stock: 1,
      purchased: 0
    },
    {
      id: 'energy_saver_max',
      name: '超级体力节省器',
      description: '永久减少所有任务的体力消耗100%',
      price: 999999,
      effect: { type: 'permanent', effectType: 'energy_save', value: 1 },
      icon: 'certificate',
      minLevel: 50,
      stock: 1,
      purchased: 0
    }
  ])

  // 当前激活的加成效果
  const activeBoosts = ref([])
  // 永久效果
  const permanentEffects = ref([])
  // 数据库名称和版本
  const DB_NAME = gameStore.DB_NAME
  const DB_VERSION = gameStore.DB_VERSION
  // 获取可购买的商品（基于玩家等级）
  const availableItems = computed(() => {
    const gameState = gameStore.gameState
    if (!gameState) return []
    const playerLevel = gameState.level || 1
    return items.value.filter(item => {
      // 检查等级要求
      if (item.minLevel > playerLevel) return false
      // 检查库存
      if (item.stock !== -1 && item.purchased >= item.stock) return false
      return true
    })
  })

  // 购买物品
  const purchaseItem = async (itemId) => {
    const item = items.value.find(i => i.id === itemId)
    if (!item) return { success: false, message: '物品不存在' }
    // 检查库存
    if (item.stock !== -1 && item.purchased >= item.stock) return { success: false, message: '物品已售罄' }
    // 获取当前游戏状态
    const gameState = await gameStore.loadGameState()
    if (!gameState) return { success: false, message: '无法加载游戏状态' }
    // 检查玩家等级
    if (gameState.level < item.minLevel) return { success: false, message: `需要达到${item.minLevel}级才能购买此物品` }
    // 检查金币是否足够
    if (gameState.resources.gold < item.price) return { success: false, message: '金币不足' }
    // 扣除金币
    gameState.resources.gold -= item.price
    // 增加购买次数
    item.purchased += 1
    // 应用物品效果
    const effectResult = await applyItemEffect(item, gameState)
    // 保存游戏状态
    await gameStore.saveGameState(gameState)
    // 保存商店数据
    saveShopData()
    return {
      success: true,
      message: `成功购买 ${item.name}`,
      effect: effectResult
    }
  }

  // 应用物品效果
  const applyItemEffect = async (item, gameState) => {
    let effectResult = { description: '' }
    switch (item.effect.type) {
      case 'resource':
        const resource = item.effect.resource
        const value = item.effect.value
        if (resource === 'gold') {
          gameState.resources.gold = Math.max(0, gameState.resources.gold + value)
          effectResult.description = `获得了 ${value} 金币`
        } else if (resource === 'energy') {
          gameState.resources.energy = Math.max(0, Math.min(100 + gameState.level, gameState.resources.energy + value))
          effectResult.description = `恢复了 ${value} 体力`
        } else if (resource === 'experience') {
          gameState.resources.experience = Math.max(0, gameState.resources.experience + value)
          effectResult.description = `获得了 ${value} 经验`
        }
        break
      case 'boost':
        // 创建加成效果
        const boost = {
          id: `${item.id}_${Date.now()}`,
          type: item.effect.boostType,
          value: item.effect.value,
          startTime: Date.now(),
          endTime: Date.now() + item.effect.duration
        }
        // 添加到激活加成列表
        activeBoosts.value.push(boost)
        // 计算剩余时间（小时和分钟）
        const hours = Math.floor(item.effect.duration / 3600000)
        const minutes = Math.floor((item.effect.duration % 3600000) / 60000)
        let durationText = ''
        if (hours > 0) durationText += `${hours}小时`
        if (minutes > 0) durationText += `${minutes}分钟`
        effectResult.description = `激活了${item.name}效果，持续${durationText}`
        break
      case 'permanent':
        // 创建永久效果
        const effect = {
          id: item.id,
          ...item.effect
        }
        // 检查是否已存在相同效果
        const existingEffectIndex = permanentEffects.value.findIndex(e => e.id === effect.id)
        // 更新现效果
        if (existingEffectIndex !== -1) permanentEffects.value[existingEffectIndex] = effect
        // 添加新效果
        else permanentEffects.value.push(effect)
        effectResult.description = `永久激活了${item.name}效果`
        break
    }
    return effectResult
  }

  // 更新加成状态（检查过期的加成）
  const updateBoosts = () => {
    const currentTime = Date.now()
    let expired = false
    // 过滤掉过期的加成
    activeBoosts.value = activeBoosts.value.filter(boost => {
      if (boost.endTime <= currentTime) {
        expired = true
        return false
      }
      return true
    })
    // 保存商店数据
    if (expired) saveShopData()
    return expired
  }

  // 获取特定类型的加成总值
  const getBoostValue = (boostType) => {
    let totalBoost = 0
    // 检查临时加成
    activeBoosts.value.forEach(boost => {
      if (boost.type === boostType) totalBoost += boost.value
    })
    // 检查永久加成
    permanentEffects.value.forEach(effect => {
      if (effect.effectType === boostType) totalBoost += effect.value
    })
    return totalBoost
  }

  // 获取特定任务的加成
  const getTaskBoost = (taskId, resourceType) => {
    let totalBoost = 0
    // 检查永久加成
    permanentEffects.value.forEach(effect => {
      if (effect.effectType === 'task_boost' &&
        effect.taskId === taskId &&
        effect.resourceType === resourceType) {
        totalBoost += effect.value
      }
    })
    return totalBoost
  }

  // 获取体力节省值
  const getEnergySaveValue = () => {
    let totalSave = 0
    // 检查永久加成
    permanentEffects.value.forEach(effect => {
      if (effect.effectType === 'energy_save') totalSave += effect.value
    })
    return totalSave
  }

  // 保存商店数据
  const saveShopData = async () => {
    try {
      const db = await openDB(DB_NAME, DB_VERSION, (db, oldVersion) => initDatabase(db, oldVersion, DB_VERSION))
      // 转换数据为可序列化格式
      const shopData = {
        id: 'shopState',
        items: items.value.map(item => ({
          ...item,
          effect: JSON.parse(JSON.stringify(item.effect))
        })),
        activeBoosts: activeBoosts.value.map(boost => ({
          ...boost,
          active: undefined
        })),
        version: DB_VERSION,
        lastUpdated: new Date().getTime()
      }
      // 保存商店状态
      const tx = db.transaction('shop', 'readwrite')
      tx.objectStore('shop').put(shopData)
      // 保存永久效果
      const permanentEffectsData = {
        id: 'permanentEffects',
        effects: JSON.parse(JSON.stringify(permanentEffects.value)),
        lastUpdated: new Date().getTime()
      }
      tx.objectStore('shop').put(permanentEffectsData)
      await tx.done
      return true
    } catch (error) {
      console.error('保存商店数据失败:', error)
      return false
    }
  }

  // 加载商店数据
  const loadShopData = async () => {
    try {
      const db = await openDB(DB_NAME, DB_VERSION, (db, oldVersion) => {
        // 数据库升级处理
        // 确保在任何版本下都检查并创建shop对象存储
        if (!db.objectStoreNames.contains('shop')) db.createObjectStore('shop', { keyPath: 'id' })
      })
      // 从数据库加载
      const shopData = await db.get('shop', 'shopState')
      const permanentEffectsData = await db.get('shop', 'permanentEffects')
      // 加载商店物品数据
      if (shopData && shopData.items) {
        // 更新物品列表，但保留默认物品的结构
        const savedItems = shopData.items
        // 合并保存的物品状态到默认物品列表
        items.value = items.value.map(defaultItem => {
          const savedItem = savedItems.find(i => i.id === defaultItem.id)
          return savedItem ? { ...defaultItem, ...savedItem } : defaultItem
        })
      }
      // 加载临时加成数据
      if (shopData && shopData.activeBoosts) {
        // 过滤掉已过期的加成
        const currentTime = Date.now()
        activeBoosts.value = shopData.activeBoosts.filter(boost => boost.endTime > currentTime)
      }
      // 加载永久效果数据
      if (permanentEffectsData && permanentEffectsData.effects) permanentEffects.value = permanentEffectsData.effects
      return true
    } catch (error) {
      console.error('加载商店数据失败:', error)
      return false
    }
  }
  // 初始化
  const initialize = async () => {
    await loadShopData()
    updateBoosts()
  }

  return {
    items,
    activeBoosts,
    permanentEffects,
    availableItems,
    purchaseItem,
    updateBoosts,
    getBoostValue,
    getTaskBoost,
    getEnergySaveValue,
    initialize
  }
})