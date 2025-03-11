import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useGameStore } from './game'
import { openDB } from '../utils/indexedDB'

export const useSkillStore = defineStore('skills', () => {
  // 游戏状态存储
  const gameStore = useGameStore()

  // 技能列表
  const skills = ref([
    {
      id: 'mining',
      name: '采矿技能',
      description: '提高采集资源任务的金币获取效率',
      maxLevel: 5,
      currentLevel: 0,
      effect: { type: 'gold_boost', taskId: 1, valuePerLevel: 0.2 }, // 每级增加20%金币
      upgradeCost: level => ({ gold: 50 * (level + 1) }),
      icon: 'gold-coin'
    },
    {
      id: 'exploration',
      name: '探索技能',
      description: '提高探索地图任务的经验获取效率',
      maxLevel: 5,
      currentLevel: 0,
      effect: { type: 'exp_boost', taskId: 2, valuePerLevel: 0.15 }, // 每级增加15%经验
      upgradeCost: level => ({ gold: 75 * (level + 1) }),
      icon: 'location'
    },
    {
      id: 'combat',
      name: '战斗技能',
      description: '提高击败怪物任务的金币和经验获取效率',
      maxLevel: 5,
      currentLevel: 0,
      effect: { type: 'all_boost', taskId: 3, valuePerLevel: 0.1 }, // 每级增加10%全部奖励
      upgradeCost: level => ({ gold: 100 * (level + 1) }),
      icon: 'fire'
    },
    {
      id: 'energy_recovery',
      name: '精力恢复',
      description: '提高体力自然恢复速度',
      maxLevel: 3,
      currentLevel: 0,
      effect: { type: 'energy_regen', valuePerLevel: 1 }, // 每级每分钟多恢复1点体力
      upgradeCost: level => ({ gold: 150 * (level + 1) }),
      icon: 'replay'
    },
    {
      id: 'efficiency',
      name: '效率提升',
      description: '减少所有任务的体力消耗',
      maxLevel: 3,
      currentLevel: 0,
      effect: { type: 'energy_save', valuePerLevel: 0.1 }, // 每级减少10%体力消耗
      upgradeCost: level => ({ gold: 200 * (level + 1) }),
      icon: 'certificate'
    }
  ])

  // 数据库名称和版本
  const DB_NAME = gameStore.DB_NAME
  const DB_VERSION = gameStore.DB_VERSION

  // 获取已解锁的技能
  const unlockedSkills = computed(() => {
    return skills.value.filter(skill => skill.currentLevel > 0)
  })

  // 获取可升级的技能
  const upgradableSkills = computed(() => {
    return skills.value.filter(skill => skill.currentLevel < skill.maxLevel)
  })

  // 计算技能效果
  const calculateSkillEffect = (type, taskId = null) => {
    let totalEffect = 0
    skills.value.forEach(skill => {
      if (skill.currentLevel <= 0) return
      const effect = skill.effect
      // 检查技能类型是否匹配
      if ((effect.type === type || (effect.type === 'all_boost' && (type === 'gold_boost' || type === 'exp_boost'))) && (taskId === null || effect.taskId === null || effect.taskId === taskId)) totalEffect += effect.valuePerLevel * skill.currentLevel
    })
    return totalEffect
  }

  // 升级技能
  const upgradeSkill = async (skillId) => {
    const skill = skills.value.find(s => s.id === skillId)
    if (!skill) return { success: false, message: '技能不存在' }
    if (skill.currentLevel >= skill.maxLevel) return { success: false, message: '技能已达到最高等级' }
    // 计算升级成本
    const cost = skill.upgradeCost(skill.currentLevel)
    // 获取当前游戏状态
    const gameState = await gameStore.loadGameState()
    if (!gameState) return { success: false, message: '无法加载游戏状态' }
    // 检查资源是否足够
    if (gameState.resources.gold < cost.gold) return { success: false, message: '金币不足' }
    // 扣除资源
    gameState.resources.gold -= cost.gold
    // 升级技能
    skill.currentLevel += 1
    // 保存游戏状态
    await gameStore.saveGameState(gameState)
    // 保存技能数据
    saveSkills()
    return {
      success: true,
      message: `${skill.name}升级成功，当前等级: ${skill.currentLevel}`,
      newLevel: skill.currentLevel
    }
  }

  // 应用技能效果到任务奖励
  const applySkillsToReward = (task, reward) => {
    const goldBoost = calculateSkillEffect('gold_boost', task.id)
    const expBoost = calculateSkillEffect('exp_boost', task.id)
    // 创建一个新的奖励对象，避免修改原始对象
    const boostedReward = { ...reward }
    if (goldBoost > 0) boostedReward.gold = Math.floor(reward.gold * (1 + goldBoost))
    if (expBoost > 0) boostedReward.experience = Math.floor(reward.experience * (1 + expBoost))
    return boostedReward
  }

  // 应用技能效果到体力消耗
  const applySkillsToEnergyCost = (task) => {
    const energySave = calculateSkillEffect('energy_save')
    if (energySave <= 0) return task.energyCost
    // 计算减少后的体力消耗，最低为1
    return Math.max(1, Math.floor(task.energyCost * (1 - energySave)))
  }

  // 获取体力恢复速率（每分钟）
  const getEnergyRegenerationRate = () => {
    // 基础恢复率 + 技能加成
    const baseRate = 1 // 每分钟恢复1点体力
    const skillBonus = calculateSkillEffect('energy_regen')
    return baseRate + skillBonus
  }

  // 保存技能数据
  const saveSkills = async () => {
    try {
      const db = await openDB(DB_NAME, DB_VERSION, (db, oldVersion) => {
        // 数据库升级处理
        // 创建技能存储
        if (oldVersion < 3 && !db.objectStoreNames.contains('skills')) db.createObjectStore('skills', { keyPath: 'id' })
      })
      // 保存到数据库
      const tx = db.transaction('skills', 'readwrite')
      tx.objectStore('skills').put({
        id: 'skills',
        list: skills.value.map(skill => ({
          id: skill.id,
          name: skill.name,
          description: skill.description,
          maxLevel: skill.maxLevel,
          currentLevel: skill.currentLevel,
          effect: { ...skill.effect },
          icon: skill.icon
        })),
        lastUpdated: new Date().getTime()
      })
      await tx.done
      return true
    } catch (error) {
      console.error('保存技能数据失败:', error)
      return false
    }
  }

  // 加载技能数据
  const loadSkills = async () => {
    try {
      const db = await openDB(DB_NAME, DB_VERSION, (db, oldVersion) => {
        // 数据库升级处理
        // 创建技能存储
        if (oldVersion < 3 && !db.objectStoreNames.contains('skills')) db.createObjectStore('skills', { keyPath: 'id' })
      })
      // 从数据库加载
      const skillsData = await db.get('skills', 'skills')
      if (skillsData && skillsData.list) {
        // 更新本地状态，但保留默认技能的结构
        const savedSkills = skillsData.list
        // 合并保存的技能状态到默认技能列表
        skills.value = skills.value.map(defaultSkill => {
          const savedSkill = savedSkills.find(s => s.id === defaultSkill.id)
          return savedSkill ? { ...defaultSkill, ...savedSkill } : defaultSkill
        })
        return skills.value
      }
      return skills.value
    } catch (error) {
      console.error('加载技能数据失败:', error)
      return skills.value
    }
  }
  // 初始化
  const initialize = async () => {
    await loadSkills()
  }
  return {
    skills,
    unlockedSkills,
    upgradableSkills,
    calculateSkillEffect,
    upgradeSkill,
    applySkillsToReward,
    applySkillsToEnergyCost,
    getEnergyRegenerationRate,
    initialize,
    loadSkills
  }
})