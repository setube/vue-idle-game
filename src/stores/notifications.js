import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useGameStore } from './game'
import { openDB } from '../utils/indexedDB'

export const useNotificationStore = defineStore('notifications', () => {
  // 游戏状态存储
  const gameStore = useGameStore()
  // 通知列表
  const notifications = ref([])
  // 未读通知计数
  const unreadCount = ref(0)
  // 数据库名称和版本
  const DB_NAME = gameStore.DB_NAME
  const DB_VERSION = gameStore.DB_VERSION
  // 通知类型
  const NOTIFICATION_TYPES = {
    ACHIEVEMENT: 'achievement',
    DAILY_TASK: 'daily_task',
    EVENT: 'event',
    SYSTEM: 'system'
  }
  // 获取未读通知
  const unreadNotifications = computed(() => {
    return notifications.value.filter(notification => !notification.read)
  })

  // 获取已读通知
  const readNotifications = computed(() => {
    return notifications.value.filter(notification => notification.read)
  })

  // 初始化通知系统
  const initialize = async () => {
    await loadNotifications()
    updateUnreadCount()
  }

  // 创建新通知
  const createNotification = async ({
    title,
    message,
    type = NOTIFICATION_TYPES.SYSTEM,
    icon = null,
    data = {}
  }) => {
    const now = new Date().getTime()
    // 创建通知对象
    const notification = {
      id: `notification_${now}_${Math.floor(Math.random() * 1000)}`,
      title,
      message,
      type,
      icon: icon || getDefaultIconForType(type),
      data,
      timestamp: now,
      read: false
    }
    // 添加到通知列表
    notifications.value.unshift(notification)
    // 限制通知数量，最多保留50条
    if (notifications.value.length > 50) notifications.value = notifications.value.slice(0, 50)
    // 更新未读计数
    updateUnreadCount()
    // 保存到数据库
    await saveNotifications()
    return notification
  }

  // 根据通知类型获取默认图标
  const getDefaultIconForType = (type) => {
    switch (type) {
      case NOTIFICATION_TYPES.ACHIEVEMENT:
        return 'award'
      case NOTIFICATION_TYPES.DAILY_TASK:
        return 'calendar'
      case NOTIFICATION_TYPES.EVENT:
        return 'gift'
      case NOTIFICATION_TYPES.SYSTEM:
      default:
        return 'info'
    }
  }

  // 标记通知为已读
  const markAsRead = async (notificationId) => {
    const notification = notifications.value.find(n => n.id === notificationId)
    if (notification && !notification.read) {
      notification.read = true
      updateUnreadCount()
      await saveNotifications()
    }
  }

  // 标记所有通知为已读
  const markAllAsRead = async () => {
    let updated = false
    notifications.value.forEach(notification => {
      if (!notification.read) {
        notification.read = true
        updated = true
      }
    })
    if (updated) {
      updateUnreadCount()
      await saveNotifications()
    }
  }

  // 更新未读通知计数
  const updateUnreadCount = () => {
    unreadCount.value = notifications.value.filter(notification => !notification.read).length
  }

  // 删除通知
  const deleteNotification = async (notificationId) => {
    const index = notifications.value.findIndex(n => n.id === notificationId)
    if (index !== -1) {
      notifications.value.splice(index, 1)
      updateUnreadCount()
      await saveNotifications()
    }
  }

  // 清空所有通知
  const clearAllNotifications = async () => {
    notifications.value = []
    updateUnreadCount()
    await saveNotifications()
  }

  // 保存通知到数据库
  const saveNotifications = async () => {
    try {
      const db = await openDB(DB_NAME, DB_VERSION, (db, oldVersion) => {
        // 如果不存在notifications存储，创建它
        if (!db.objectStoreNames.contains('notifications')) db.createObjectStore('notifications', { keyPath: 'id' })
      })
      // 准备要保存的数据，使用JSON序列化和解析进行深拷贝，确保数据可序列化
      const dataToSave = {
        id: 'userNotifications',
        notifications: JSON.parse(JSON.stringify(notifications.value)),
        lastUpdated: new Date().getTime()
      }
      // 保存到数据库
      const tx = db.transaction('notifications', 'readwrite')
      tx.objectStore('notifications').put(dataToSave)
      await tx.done
      return true
    } catch (error) {
      console.error('保存通知失败:', error)
      return false
    }
  }

  // 从数据库加载通知
  const loadNotifications = async () => {
    try {
      const db = await openDB(DB_NAME, DB_VERSION, (db, oldVersion) => {
        // 如果不存在notifications存储，创建它
        if (!db.objectStoreNames.contains('notifications')) db.createObjectStore('notifications', { keyPath: 'id' })
      })
      // 从数据库加载
      const data = await db.get('notifications', 'userNotifications')
      if (data) {
        notifications.value = data.notifications
        updateUnreadCount()
        return data
      }
      return null
    } catch (error) {
      console.error('加载通知失败:', error)
      return null
    }
  }

  // 创建成就完成通知
  const createAchievementNotification = async (achievement) => {
    return await createNotification({
      title: '成就达成',
      message: `你完成了成就「${achievement.name}」，获得奖励：${achievement.reward.gold}金币，${achievement.reward.experience}经验`,
      type: NOTIFICATION_TYPES.ACHIEVEMENT,
      icon: 'award',
      data: { achievementId: achievement.id }
    })
  }

  // 创建每日任务通知
  const createDailyTaskNotification = async (task, isCompleted = false) => {
    if (isCompleted) {
      return await createNotification({
        title: '任务完成',
        message: `你完成了任务「${task.name}」，可以领取奖励了！`,
        type: NOTIFICATION_TYPES.DAILY_TASK,
        icon: 'calendar',
        data: { taskId: task.id }
      })
    } else {
      return await createNotification({
        title: '任务已刷新',
        message: '新的每小时任务已经刷新，快去查看吧！',
        type: NOTIFICATION_TYPES.DAILY_TASK,
        icon: 'calendar'
      })
    }
  }

  // 创建随机事件通知
  const createEventNotification = async (event) => {
    return await createNotification({
      title: '随机事件',
      message: event.description,
      type: NOTIFICATION_TYPES.EVENT,
      icon: event.icon || 'gift',
      data: { eventId: event.id }
    })
  }

  // 创建系统通知
  const createSystemNotification = async (title, message) => {
    return await createNotification({
      title,
      message,
      type: NOTIFICATION_TYPES.SYSTEM
    })
  }

  return {
    notifications,
    unreadNotifications,
    readNotifications,
    unreadCount,
    NOTIFICATION_TYPES,
    initialize,
    createNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
    createAchievementNotification,
    createDailyTaskNotification,
    createEventNotification,
    createSystemNotification
  }
})