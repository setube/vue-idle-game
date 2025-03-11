import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useGameStore } from './game'
import { openDB } from '../utils/indexedDB'
import { useNotificationStore } from './notifications'

export const usePetStore = defineStore('pets', () => {
  // 游戏状态存储
  const gameStore = useGameStore()
  // 宠物列表
  const pets = ref([])
  // 当前选中的宠物
  const activePet = ref(null)
  // 数据库名称和版本
  const DB_NAME = gameStore.DB_NAME
  const DB_VERSION = gameStore.DB_VERSION
  // 通知系统
  const notificationStore = useNotificationStore()
  // 宠物稀有度
  const RARITY = {
    COMMON: 'common',
    UNCOMMON: 'uncommon',
    RARE: 'rare',
    EPIC: 'epic',
    LEGENDARY: 'legendary'
  }
  // 宠物类型
  const PET_TYPES = {
    ATTACK: 'attack',  // 增加攻击力
    DEFENSE: 'defense', // 增加防御力
    UTILITY: 'utility', // 提供实用效果
    GOLD: 'gold',      // 增加金币获取
    ENERGY: 'energy'   // 减少体力消耗或增加体力恢复
  }

  // 初始化宠物系统
  const initialize = async () => {
    await loadPets()
    // 如果有激活的宠物，设置它
    if (pets.value.length > 0) {
      const active = pets.value.find(pet => pet.active)
      if (active) activePet.value = active
    }
  }

  // 加载宠物数据
  const loadPets = async () => {
    try {
      const db = await openDB(DB_NAME, DB_VERSION, (db, oldVersion) => {
        // 确保pets对象存储存在
        if (!db.objectStoreNames.contains('pets')) db.createObjectStore('pets', { keyPath: 'id' })
      })
      const petData = await db.getAll('pets')
      if (petData && petData.length > 0) {
        pets.value = petData
        return petData
      }
      return []
    } catch (error) {
      console.error('加载宠物数据失败:', error)
      return []
    }
  }

  // 保存宠物数据
  const savePets = async () => {
    try {
      const db = await openDB(DB_NAME, DB_VERSION, (db, oldVersion) => {
        // 确保pets对象存储存在
        if (!db.objectStoreNames.contains('pets')) db.createObjectStore('pets', { keyPath: 'id' })
      })
      const tx = db.transaction('pets', 'readwrite')
      // 清空现有数据
      tx.objectStore('pets').clear()
      // 保存所有宠物 - 使用JSON序列化和解析创建纯数据对象的深拷贝
      for (const pet of pets.value) {
        // 创建纯数据对象的深拷贝，确保没有不可序列化的内容
        const petData = JSON.parse(JSON.stringify(pet))
        tx.objectStore('pets').add(petData)
      }
      await tx.done
      return true
    } catch (error) {
      console.error('保存宠物数据失败:', error)
      return false
    }
  }

  // 捕获新宠物
  const capturePet = async (petData) => {
    // 创建新宠物
    const newPet = {
      id: `pet_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      name: petData.name,
      type: petData.type,
      rarity: petData.rarity,
      level: 1,
      experience: 0,
      maxExperience: 100,
      stats: petData.stats,
      skills: petData.skills || [],
      active: false,
      capturedAt: new Date().getTime()
    }
    // 添加到宠物列表
    pets.value.push(newPet)
    await savePets()
    // 创建通知
    await notificationStore.createNotification({
      title: '捕获新宠物',
      message: `你捕获了一只${getRarityName(newPet.rarity)}的宠物：${newPet.name}！`,
      type: notificationStore.NOTIFICATION_TYPES.SYSTEM,
      data: { petId: newPet.id }
    })
    return newPet
  }

  // 获取稀有度名称
  const getRarityName = (rarity) => {
    switch (rarity) {
      case RARITY.COMMON: return '普通'
      case RARITY.UNCOMMON: return '优秀'
      case RARITY.RARE: return '稀有'
      case RARITY.EPIC: return '史诗'
      case RARITY.LEGENDARY: return '传说'
      default: return '未知'
    }
  }

  // 获取宠物类型名称
  const getPetTypeName = (type) => {
    switch (type) {
      case PET_TYPES.ATTACK: return '攻击'
      case PET_TYPES.DEFENSE: return '防御'
      case PET_TYPES.UTILITY: return '实用'
      case PET_TYPES.GOLD: return '金币'
      case PET_TYPES.ENERGY: return '体力'
      default: return '未知'
    }
  }

  // 激活宠物
  const activatePet = async (petId) => {
    // 取消所有宠物的激活状态
    pets.value.forEach(pet => pet.active = false)
    // 激活选中的宠物
    const pet = pets.value.find(p => p.id === petId)
    if (pet) {
      pet.active = true
      activePet.value = pet
      await savePets()
      return true
    }
    return false
  }

  // 给宠物喂食（增加经验值）
  const feedPet = async (petId, expAmount) => {
    const pet = pets.value.find(p => p.id === petId)
    if (!pet) return { success: false, message: '宠物不存在' }
    // 增加经验值
    pet.experience += expAmount
    // 检查是否升级
    let leveledUp = false
    while (pet.experience >= pet.maxExperience) {
      pet.level += 1
      pet.experience -= pet.maxExperience
      pet.maxExperience = Math.floor(pet.maxExperience * 1.5)
      // 提升宠物属性
      Object.keys(pet.stats).forEach(stat => {
        pet.stats[stat] = Math.floor(pet.stats[stat] * 1.2)
      })
      leveledUp = true
    }
    await savePets()
    // 如果升级了，创建通知
    if (leveledUp) {
      await notificationStore.createNotification({
        title: '宠物升级',
        message: `你的宠物${pet.name}升级到了${pet.level}级！`,
        type: notificationStore.NOTIFICATION_TYPES.SYSTEM,
        data: { petId: pet.id }
      })
    }
    return {
      success: true,
      message: leveledUp ? `宠物升级到了${pet.level}级！` : '喂食成功',
      leveledUp
    }
  }
  // 重命名宠物
  const renamePet = async (petId, newName) => {
    const pet = pets.value.find(p => p.id === petId)
    if (!pet) return { success: false, message: '宠物不存在' }
    pet.name = newName
    await savePets()
    return { success: true, message: '重命名成功' }
  }

  // 获取宠物提供的加成
  const getPetBonus = (type, value) => {
    if (!activePet.value) return 0
    const pet = activePet.value
    // 根据宠物类型和等级计算加成
    let bonus = 0
    // 主类型加成更高
    if (pet.type === type) bonus = (pet.stats[value] || 0) * (1 + pet.level * 0.05)
    // 非主类型加成较低
    else bonus = (pet.stats[value] || 0) * (1 + pet.level * 0.02)
    return Math.floor(bonus)
  }

  // 获取可用的宠物列表
  const availablePets = computed(() => {
    return pets.value.sort((a, b) => {
      // 首先按稀有度排序
      const rarityOrder = {
        [RARITY.LEGENDARY]: 0,
        [RARITY.EPIC]: 1,
        [RARITY.RARE]: 2,
        [RARITY.UNCOMMON]: 3,
        [RARITY.COMMON]: 4
      }
      if (rarityOrder[a.rarity] !== rarityOrder[b.rarity]) return rarityOrder[a.rarity] - rarityOrder[b.rarity]
      // 然后按等级排序
      return b.level - a.level
    })
  })

  return {
    pets,
    activePet,
    RARITY,
    PET_TYPES,
    initialize,
    capturePet,
    activatePet,
    feedPet,
    renamePet,
    getPetBonus,
    getRarityName,
    getPetTypeName,
    availablePets
  }
})