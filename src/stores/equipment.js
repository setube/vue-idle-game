import { defineStore } from 'pinia'
import { ref } from 'vue'
import { openDB, initDatabase } from '../utils/indexedDB'
import { useGameStore } from './game'

export const useEquipmentStore = defineStore('equipment', () => {
  // 装备数据
  const equipments = ref([])
  // 已装备的物品
  const equippedItems = ref({})

  // 装备类型
  const EQUIPMENT_TYPES = {
    WEAPON: 'weapon',
    HELMET: 'helmet',
    ARMOR: 'armor',
    SHIELD: 'shield',
    ACCESSORY: 'accessory'
  }

  // 装备稀有度
  const RARITY = {
    COMMON: 'common',
    UNCOMMON: 'uncommon',
    RARE: 'rare',
    EPIC: 'epic',
    LEGENDARY: 'legendary'
  }

  // 稀有度颜色
  const RARITY_COLORS = {
    [RARITY.COMMON]: '#9d9d9d',
    [RARITY.UNCOMMON]: '#1eff00',
    [RARITY.RARE]: '#0070dd',
    [RARITY.EPIC]: '#a335ee',
    [RARITY.LEGENDARY]: '#ff8000'
  }

  // 初始化装备系统
  const initialize = async () => {
    try {
      const gameStore = useGameStore()
      // 使用共享的数据库初始化函数
      const db = await openDB(gameStore.DB_NAME, gameStore.DB_VERSION, (db, oldVersion) => initDatabase(db, oldVersion, gameStore.DB_VERSION))
      // 从数据库加载装备
      const savedEquipments = await db.getAll('equipment')
      if (savedEquipments && savedEquipments.length > 0) {
        equipments.value = savedEquipments.filter(item => item.id !== 'equipped')
        // 加载已装备的物品
        const equipped = await db.get('equipment', 'equipped')
        if (equipped) equippedItems.value = equipped.items || {}
      }
      return true
    } catch (error) {
      console.error('初始化装备系统失败:', error)
      return false
    }
  }

  // 添加装备
  const addEquipment = async (equipment) => {
    try {
      // 确保装备有唯一ID
      if (!equipment.id) equipment.id = `${equipment.type}_${Date.now()}_${Math.floor(Math.random() * 1000)}`
      // 确保装备有稀有度
      if (!equipment.rarity) equipment.rarity = RARITY.COMMON
      // 添加获取时间
      equipment.acquiredAt = Date.now()
      // 添加到装备列表
      equipments.value.push(equipment)
      // 保存到数据库
      const gameStore = useGameStore()
      const db = await openDB(gameStore.DB_NAME, gameStore.DB_VERSION)
      const tx = db.transaction('equipment', 'readwrite')
      tx.objectStore('equipment').put(equipment)
      await tx.done
      return { success: true, message: `获得装备: ${equipment.name}`, equipment }
    } catch (error) {
      console.error('添加装备失败:', error)
      return { success: false, message: '添加装备失败: ' + error.message }
    }
  }

  // 装备物品
  const equipItem = async (equipmentId) => {
    try {
      const equipment = equipments.value.find(e => e.id === equipmentId)
      if (!equipment) return { success: false, message: '装备不存在' }
      // 卸下同类型的装备
      const currentEquipped = equippedItems.value[equipment.type]
      if (currentEquipped) {
        const result = await unequipItem(equipment.type)
        if (!result.success) return result
      }
      // 装备新物品
      equippedItems.value[equipment.type] = equipmentId
      // 保存到数据库
      const gameStore = useGameStore()
      const db = await openDB(gameStore.DB_NAME, gameStore.DB_VERSION)
      const tx = db.transaction('equipment', 'readwrite')
      tx.objectStore('equipment').put({
        id: 'equipped',
        items: JSON.parse(JSON.stringify(equippedItems.value))
      })
      await tx.done
      return { success: true, message: `已装备: ${equipment.name}` }
    } catch (error) {
      console.error('装备物品失败:', error)
      return { success: false, message: '装备物品失败: ' + error.message }
    }
  }

  // 卸下装备
  const unequipItem = async (type) => {
    try {
      if (!equippedItems.value[type]) return { success: false, message: '没有装备该类型的物品' }
      const equipmentId = equippedItems.value[type]
      const equipment = equipments.value.find(e => e.id === equipmentId)
      // 移除装备
      delete equippedItems.value[type]
      // 保存到数据库
      const gameStore = useGameStore()
      const db = await openDB(gameStore.DB_NAME, gameStore.DB_VERSION)
      const tx = db.transaction('equipment', 'readwrite')
      tx.objectStore('equipment').put({
        id: 'equipped',
        items: JSON.parse(JSON.stringify(equippedItems.value))
      })
      await tx.done
      return {
        success: true,
        message: equipment ? `已卸下: ${equipment.name}` : '已卸下装备'
      }
    } catch (error) {
      console.error('卸下装备失败:', error)
      return { success: false, message: '卸下装备失败: ' + error.message }
    }
  }

  // 出售装备
  const sellEquipment = async (equipmentId) => {
    try {
      const equipmentIndex = equipments.value.findIndex(e => e.id === equipmentId)
      if (equipmentIndex === -1) return { success: false, message: '装备不存在' }
      const equipment = equipments.value[equipmentIndex]
      // 检查是否已装备
      for (const [type, id] of Object.entries(equippedItems.value)) {
        if (id === equipmentId) return { success: false, message: '无法出售已装备的物品，请先卸下' }
      }
      // 计算出售价格
      const rarityMultiplier = {
        [RARITY.COMMON]: 1,
        [RARITY.UNCOMMON]: 2,
        [RARITY.RARE]: 5,
        [RARITY.EPIC]: 10,
        [RARITY.LEGENDARY]: 20
      }
      let sellPrice = 10 // 基础价格
      // 根据装备类型和稀有度调整价格
      if (equipment.value) {
        sellPrice = equipment.value
      } else if (equipment.stats) {
        // 根据装备属性计算价格
        const statsSum = Object.values(equipment.stats).reduce((sum, value) => sum + value, 0)
        sellPrice = Math.max(10, statsSum * 5)
      }
      // 应用稀有度乘数
      sellPrice = Math.floor(sellPrice * (rarityMultiplier[equipment.rarity] || 1))
      // 从列表中移除
      equipments.value.splice(equipmentIndex, 1)
      // 从数据库中删除
      const gameStore = useGameStore()
      const db = await openDB(gameStore.DB_NAME, gameStore.DB_VERSION)
      const tx = db.transaction('equipment', 'readwrite')
      tx.objectStore('equipment').delete(equipmentId)
      await tx.done
      // 更新游戏状态（增加金币）
      const gameState = await gameStore.loadGameState()
      if (gameState) {
        gameState.resources.gold += sellPrice
        await gameStore.saveGameState(gameState)
      }
      return {
        success: true,
        message: `已出售 ${equipment.name}，获得 ${sellPrice} 金币`,
        gold: sellPrice
      }
    } catch (error) {
      console.error('出售装备失败:', error)
      return { success: false, message: '出售装备失败: ' + error.message }
    }
  }

  // 强化装备
  const enhanceEquipment = async (equipmentId, materialIds) => {
    try {
      const equipment = equipments.value.find(e => e.id === equipmentId)
      if (!equipment) return { success: false, message: '装备不存在' }
      // 检查材料是否存在
      const materials = []
      for (const materialId of materialIds) {
        const material = equipments.value.find(e => e.id === materialId)
        if (!material || material.type !== 'material') return { success: false, message: '材料不存在或不是有效材料' }
        materials.push(material)
      }
      // 计算强化值
      let enhanceValue = 0
      for (const material of materials) {
        enhanceValue += material.value || 5
      }
      // 应用强化
      if (!equipment.enhancement) equipment.enhancement = 0
      equipment.enhancement += enhanceValue
      // 更新装备属性
      if (equipment.stats) {
        for (const stat in equipment.stats) {
          equipment.stats[stat] = Math.floor(equipment.stats[stat] * (1 + enhanceValue / 100))
        }
      }
      // 从列表中移除材料
      for (const materialId of materialIds) {
        const index = equipments.value.findIndex(e => e.id === materialId)
        if (index !== -1) equipments.value.splice(index, 1)
      }
      // 保存到数据库
      const gameStore = useGameStore()
      const db = await openDB(gameStore.DB_NAME, gameStore.DB_VERSION)
      const tx = db.transaction('equipment', 'readwrite')
      // 更新强化后的装备
      tx.objectStore('equipment').put(equipment)
      // 删除使用的材料
      for (const materialId of materialIds) {
        tx.objectStore('equipment').delete(materialId)
      }
      await tx.done
      return {
        success: true,
        message: `强化成功！${equipment.name} 提升了 ${enhanceValue}%`,
        equipment
      }
    } catch (error) {
      console.error('强化装备失败:', error)
      return { success: false, message: '强化装备失败: ' + error.message }
    }
  }

  // 获取已装备物品的属性总和
  const getEquippedStats = () => {
    const stats = {
      attack: 0,
      defense: 0,
      health: 0,
      speed: 0,
      critical: 0
    }
    // 遍历已装备的物品
    for (const equipmentId of Object.values(equippedItems.value)) {
      const equipment = equipments.value.find(e => e.id === equipmentId)
      if (equipment && equipment.stats) {
        // 累加属性值
        for (const [stat, value] of Object.entries(equipment.stats)) {
          if (stats[stat] !== undefined) stats[stat] += value
        }
      }
    }
    return stats
  }

  // 获取装备列表（按类型筛选）
  const getEquipmentsByType = (type) => {
    if (!type) return equipments.value
    return equipments.value.filter(e => e.type === type)
  }

  // 获取已装备的物品
  const getEquippedItems = () => {
    const result = {}
    for (const [type, equipmentId] of Object.entries(equippedItems.value)) {
      const equipment = equipments.value.find(e => e.id === equipmentId)
      if (equipment) result[type] = equipment
    }
    return result
  }

  // 获取装备的稀有度颜色
  const getRarityColor = (rarity) => {
    return RARITY_COLORS[rarity] || RARITY_COLORS[RARITY.COMMON]
  }

  return {
    // 状态
    equipments,
    equippedItems,
    // 常量
    EQUIPMENT_TYPES,
    RARITY,
    RARITY_COLORS,
    // 方法
    initialize,
    addEquipment,
    equipItem,
    unequipItem,
    sellEquipment,
    enhanceEquipment,
    getEquippedStats,
    getEquipmentsByType,
    getEquippedItems,
    getRarityColor,
  }
})