<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useNotificationStore } from '../stores/notifications'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'

const router = useRouter()
const notificationStore = useNotificationStore()

// 通知列表
const activeTab = ref(0)

// 加载通知数据
const loadNotifications = async () => await notificationStore.initialize()

// 标记通知为已读
const markAsRead = async (notificationId) => await notificationStore.markAsRead(notificationId)

// 标记所有通知为已读
const markAllAsRead = async () => await notificationStore.markAllAsRead()

// 删除通知
const deleteNotification = async (notificationId) => await notificationStore.deleteNotification(notificationId)

// 清空所有通知
const clearAllNotifications = async () => await notificationStore.clearAllNotifications()

// 格式化时间
const formatTime = (timestamp) => {
  try {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true, locale: zhCN })
  } catch (error) {
    return '未知时间'
  }
}

// 获取通知图标
const getNotificationIcon = (type) => {
  switch (type) {
    case notificationStore.NOTIFICATION_TYPES.ACHIEVEMENT:
      return 'award-o'
    case notificationStore.NOTIFICATION_TYPES.DAILY_TASK:
      return 'calendar-o'
    case notificationStore.NOTIFICATION_TYPES.EVENT:
      return 'gift-o'
    case notificationStore.NOTIFICATION_TYPES.SYSTEM:
    default:
      return 'info-o'
  }
}

// 获取通知类型文本
const getNotificationTypeText = (type) => {
  switch (type) {
    case notificationStore.NOTIFICATION_TYPES.ACHIEVEMENT:
      return '成就'
    case notificationStore.NOTIFICATION_TYPES.DAILY_TASK:
      return '每日任务'
    case notificationStore.NOTIFICATION_TYPES.EVENT:
      return '事件'
    case notificationStore.NOTIFICATION_TYPES.SYSTEM:
    default:
      return '系统'
  }
}

// 生命周期钩子
onMounted(() => {
  loadNotifications()
})
</script>

<template>
  <div class="notifications-container">
    <div class="notifications-header">
      <div class="back-button">
        <van-button icon="arrow-left" size="small" @click="router.go(-1)">返回</van-button>
      </div>
      <div class="notification-actions">
        <van-button size="small" type="primary" @click="markAllAsRead" :disabled="notificationStore.unreadCount === 0">
          全部标为已读
        </van-button>
        <van-button size="small" type="danger" @click="clearAllNotifications"
          :disabled="notificationStore.notifications.length === 0">
          清空通知
        </van-button>
      </div>
    </div>
    <van-tabs v-model:active="activeTab" animated>
      <van-tab :title="`全部 (${notificationStore.notifications.length})`">
        <div class="notification-list" v-if="notificationStore.notifications.length > 0">
          <van-cell-group inset>
            <van-swipe-cell v-for="notification in notificationStore.notifications" :key="notification.id">
              <van-cell :title="notification.title" :label="notification.message"
                :class="{ 'notification-unread': !notification.read }" @click="markAsRead(notification.id)">
                <template #icon>
                  <van-badge :dot="!notification.read" color="#1989fa">
                    <van-icon :name="getNotificationIcon(notification.type)" size="24" class="notification-icon" />
                  </van-badge>
                </template>
                <template #right-icon>
                  <div class="notification-meta">
                    <span class="notification-type">{{ getNotificationTypeText(notification.type) }}</span>
                    <span class="notification-time">{{ formatTime(notification.timestamp) }}</span>
                  </div>
                </template>
              </van-cell>
              <template #right>
                <van-button square type="danger" text="删除" @click="deleteNotification(notification.id)" />
              </template>
            </van-swipe-cell>
          </van-cell-group>
        </div>
        <div class="empty-state" v-else>
          <van-empty description="没有通知" />
        </div>
      </van-tab>
      <van-tab :title="`未读 (${notificationStore.unreadCount})`">
        <div class="notification-list" v-if="notificationStore.unreadNotifications.length > 0">
          <van-cell-group inset>
            <van-swipe-cell v-for="notification in notificationStore.unreadNotifications" :key="notification.id">
              <van-cell :title="notification.title" :label="notification.message" class="notification-unread"
                @click="markAsRead(notification.id)">
                <template #icon>
                  <van-badge dot color="#1989fa">
                    <van-icon :name="getNotificationIcon(notification.type)" size="24" class="notification-icon" />
                  </van-badge>
                </template>
                <template #right-icon>
                  <div class="notification-meta">
                    <span class="notification-type">{{ getNotificationTypeText(notification.type) }}</span>
                    <span class="notification-time">{{ formatTime(notification.timestamp) }}</span>
                  </div>
                </template>
              </van-cell>
              <template #right>
                <van-button square type="danger" text="删除" @click="deleteNotification(notification.id)" />
              </template>
            </van-swipe-cell>
          </van-cell-group>
        </div>
        <div class="empty-state" v-else>
          <van-empty description="没有未读通知" />
        </div>
      </van-tab>
    </van-tabs>
  </div>
</template>

<style scoped>
.notifications-container {
  display: flex;
  flex-direction: column;
  padding: 16px;
}

.notifications-header {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 24px;
}

.back-button {
  margin-bottom: 8px;
}

.notification-actions {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.notification-list {
  margin-top: 16px;
}

.notification-icon {
  margin-right: 8px;
}

.notification-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  font-size: 0.8rem;
}

.notification-type {
  color: #1989fa;
  font-weight: bold;
}

.notification-time {
  color: #969799;
}

.notification-unread {
  background-color: rgba(25, 137, 250, 0.05);
}

.empty-state {
  margin-top: 32px;
}
</style>