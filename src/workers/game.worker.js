/**
 * 游戏Web Worker
 * 用于处理游戏中的耗时任务，避免阻塞主线程
 */

// 任务状态管理
let activeTask = null
let taskInterval = null

// 处理来自主线程的消息
self.onmessage = (event) => {
  const { type, data } = event.data
  switch (type) {
    case 'START_TASK':
      startTask(data)
      break
    case 'CANCEL_TASK':
      cancelTask()
      break
    default:
      console.error('未知的消息类型:', type)
  }
}

/**
 * 开始执行任务
 * @param {Object} taskData - 任务数据
 */
const startTask = (taskData) => {
  // 如果有正在进行的任务，先取消它
  if (activeTask) cancelTask()
  // 设置新的活动任务
  activeTask = {
    id: taskData.taskId,
    duration: taskData.duration,
    startTime: Date.now(),
    progress: 0
  }
  // 计算更新间隔（每秒更新10次进度）
  const updateInterval = Math.max(50, Math.floor(taskData.duration / 100))
  // 设置定时器来更新任务进度
  taskInterval = setInterval(() => {
    updateTaskProgress()
  }, updateInterval)
}

/**
 * 更新任务进度
 */
const updateTaskProgress = () => {
  if (!activeTask) return
  const elapsedTime = Date.now() - activeTask.startTime
  const progress = Math.min(100, Math.floor((elapsedTime / activeTask.duration) * 100))
  // 更新进度
  activeTask.progress = progress
  // 发送进度更新到主线程
  self.postMessage({
    type: 'TASK_PROGRESS',
    data: {
      taskId: activeTask.id,
      progress: progress
    }
  })
  // 如果任务完成，清理资源
  if (progress >= 100) {
    clearInterval(taskInterval)
    taskInterval = null
    activeTask = null
  }
}

/**
 * 取消当前任务
 */
const cancelTask = () => {
  if (taskInterval) {
    clearInterval(taskInterval)
    taskInterval = null
  }
  activeTask = null
  // 通知主线程任务已取消
  self.postMessage({
    type: 'TASK_CANCELLED'
  })
}

// 确保在Worker终止时清理资源
self.addEventListener('beforeunload', () => {
  if (taskInterval) clearInterval(taskInterval)
})