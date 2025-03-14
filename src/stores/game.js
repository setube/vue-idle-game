import { defineStore } from 'pinia'
import { ref } from 'vue'
import { openDB, initDatabase } from '../utils/indexedDB'

export const useGameStore = defineStore('game', () => {
  // 游戏状态
  const gameState = ref(null)
  const settings = ref(null)
  // 数据库名称和版本
  const DB_NAME = 'idle-game-db'
  const DB_VERSION = 5  // 更新版本号以确保创建所有对象存储
  // 保存游戏状态
  const saveGameState = async (state) => {
    try {
      const db = await openDB(DB_NAME, DB_VERSION, (db, oldVersion) => {
        // 使用共享的数据库初始化函数
        initDatabase(db, oldVersion, DB_VERSION)
      })
      // 准备要保存的数据
      const stateToSave = {
        id: 'current',
        ...state,
        lastUpdated: new Date().getTime()
      }
      // 保存到数据库
      const tx = db.transaction('gameState', 'readwrite')
      tx.objectStore('gameState').put(stateToSave)
      await tx.done
      // 更新本地状态
      gameState.value = stateToSave
      return true
    } catch (error) {
      console.error('保存游戏状态失败:', error)
      return false
    }
  }

  // 加载游戏状态
  const loadGameState = async () => {
    try {
      // 使用共享的数据库初始化函数
      const db = await openDB(DB_NAME, DB_VERSION, (db, oldVersion) => initDatabase(db, oldVersion, DB_VERSION))
      // 从数据库加载
      const state = await db.get('gameState', 'current')
      if (state) {
        // 更新本地状态
        gameState.value = state
        return state
      }
      return null
    } catch (error) {
      console.error('加载游戏状态失败:', error)
      return null
    }
  }

  // 保存设置
  const saveSettings = async (userSettings) => {
    try {
      // 使用共享的数据库初始化函数
      const db = await openDB(DB_NAME, DB_VERSION, (db, oldVersion) => initDatabase(db, oldVersion, DB_VERSION))
      // 准备要保存的数据
      const settingsToSave = {
        id: 'userSettings',
        ...userSettings,
        lastUpdated: new Date().getTime()
      }
      // 保存到数据库
      const tx = db.transaction('settings', 'readwrite')
      tx.objectStore('settings').put(settingsToSave)
      await tx.done
      // 更新本地状态
      settings.value = settingsToSave
      return true
    } catch (error) {
      console.error('保存设置失败:', error)
      return false
    }
  }

  // 加载设置
  const loadSettings = async () => {
    try {
      // 使用共享的数据库初始化函数
      const db = await openDB(DB_NAME, DB_VERSION, (db, oldVersion) => initDatabase(db, oldVersion, DB_VERSION))
      // 从数据库加载
      const userSettings = await db.get('settings', 'userSettings')
      if (userSettings) {
        // 更新本地状态
        settings.value = userSettings
        return userSettings
      }
      return null
    } catch (error) {
      console.error('加载设置失败:', error)
      return null
    }
  }

  // 重置游戏
  const resetGame = async () => {
    try {
      // 关闭现有数据库连接
      if (indexedDB && indexedDB.deleteDatabase) indexedDB.deleteDatabase(DB_NAME)
      // 重置本地状态
      gameState.value = null
      settings.value = null
      return true
    } catch (error) {
      console.error('重置游戏失败:', error)
      return false
    }
  }

  // 导出游戏数据
  const exportGameData = async () => {
    try {
      const db = await openDB(DB_NAME, DB_VERSION, (db, oldVersion) => initDatabase(db, oldVersion, DB_VERSION))
      // 从各个存储中获取数据
      const state = await db.get('gameState', 'current')
      const userSettings = await db.get('settings', 'userSettings')
      const skills = await db.getAll('skills')
      const shopItems = await db.getAll('shop')
      const events = await db.getAll('events')
      const achievements = await db.getAll('achievements')
      const dailyTasks = await db.getAll('dailyTasks')
      const notifications = await db.getAll('notifications')
      const pets = await db.getAll('pets')
      // 组织导出数据
      const exportData = {
        version: DB_VERSION,
        timestamp: new Date().getTime(),
        gameState: state,
        settings: userSettings,
        skills,
        shop: shopItems,
        events,
        achievements,
        dailyTasks,
        notifications,
        pets
      }
      return {
        success: true,
        data: exportData
      }
    } catch (error) {
      console.error('导出游戏数据失败:', error)
      return {
        success: false,
        error: '导出游戏数据失败: ' + error.message
      }
    }
  }

  // 导入游戏数据
  const importGameData = async (importData) => {
    try {
      // 验证导入数据
      if (!importData || !importData.version || !importData.gameState) {
        return {
          success: false,
          error: '无效的游戏数据文件'
        }
      }
      const db = await openDB(DB_NAME, DB_VERSION, (db, oldVersion) => initDatabase(db, oldVersion, DB_VERSION))
      // 导入游戏状态
      if (importData.gameState) {
        const tx = db.transaction('gameState', 'readwrite')
        tx.objectStore('gameState').put(importData.gameState)
        await tx.done
        gameState.value = importData.gameState
      }
      // 导入设置
      if (importData.settings) {
        const tx = db.transaction('settings', 'readwrite')
        tx.objectStore('settings').put(importData.settings)
        await tx.done
        settings.value = importData.settings
      }
      // 导入技能数据
      if (importData.skills && importData.skills.length > 0) {
        const tx = db.transaction('skills', 'readwrite')
        const store = tx.objectStore('skills')
        await Promise.all(importData.skills.map(skill => store.put(skill)))
        await tx.done
      }
      // 导入商店数据
      if (importData.shop && importData.shop.length > 0) {
        const tx = db.transaction('shop', 'readwrite')
        const store = tx.objectStore('shop')
        await Promise.all(importData.shop.map(item => store.put(item)))
        await tx.done
      }
      // 导入事件数据
      if (importData.events && importData.events.length > 0) {
        const tx = db.transaction('events', 'readwrite')
        const store = tx.objectStore('events')
        await Promise.all(importData.events.map(event => store.put(event)))
        await tx.done
      }
      // 导入成就数据
      if (importData.achievements && importData.achievements.length > 0) {
        const tx = db.transaction('achievements', 'readwrite')
        const store = tx.objectStore('achievements')
        await Promise.all(importData.achievements.map(achievement => store.put(achievement)))
        await tx.done
      }
      // 导入每日任务数据
      if (importData.dailyTasks && importData.dailyTasks.length > 0) {
        const tx = db.transaction('dailyTasks', 'readwrite')
        const store = tx.objectStore('dailyTasks')
        await Promise.all(importData.dailyTasks.map(task => store.put(task)))
        await tx.done
      }
      // 导入通知数据
      if (importData.notifications && importData.notifications.length > 0) {
        const tx = db.transaction('notifications', 'readwrite')
        const store = tx.objectStore('notifications')
        await Promise.all(importData.notifications.map(notification => store.put(notification)))
        await tx.done
      }
      // 导入宠物数据
      if (importData.pets && importData.pets.length > 0) {
        const tx = db.transaction('pets', 'readwrite')
        const store = tx.objectStore('pets')
        await Promise.all(importData.pets.map(pet => store.put(pet)))
        await tx.done
      }
      return {
        success: true
      }
    } catch (error) {
      console.error('导入游戏数据失败:', error)
      return {
        success: false,
        error: '导入游戏数据失败: ' + error.message
      }
    }
  }

  return {
    gameState,
    settings,
    saveGameState,
    loadGameState,
    saveSettings,
    loadSettings,
    resetGame,
    exportGameData,
    importGameData,
    DB_NAME,
    DB_VERSION
  }
})