<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useExplorationStore } from '../stores/exploration'
import { useEquipmentStore } from '../stores/equipment'
import { useGameStore } from '../stores/game'
import { showToast, showDialog } from 'vant'

const router = useRouter()
const explorationStore = useExplorationStore()
const equipmentStore = useEquipmentStore()
const gameStore = useGameStore()

// 玩家资源
const resources = ref({
  gold: 0,
  energy: 0,
  level: 1
})

// 探索区域
const areas = ref([])
const selectedArea = ref(null)

// 探索状态
const resultData = ref({})
const dialogVisible = ref(false)
const explorationState = ref(null)
const explorationProgress = ref(0)
const progressTimer = ref(null)

// 探索历史
const explorationHistory = ref([])
const activeTab = ref(0)

// 加载数据
const loadData = async () => {
  // 初始化探索系统
  await explorationStore.initialize()
  // 初始化装备系统
  await equipmentStore.initialize()
  // 加载玩家资源
  const gameState = await gameStore.loadGameState()
  if (gameState) {
    resources.value.gold = gameState.resources.gold
    resources.value.energy = gameState.resources.energy
    resources.value.level = gameState.level
  }
  // 加载探索区域
  areas.value = explorationStore.getAvailableAreas(resources.value.level)
  // 加载探索状态
  explorationState.value = explorationStore.explorationState
  // 如果有正在进行的探索，启动进度计时器
  if (explorationState.value && explorationState.value.status === 'exploring') startProgressTimer()
  // 如果有已完成但未领取的探索，显示完成状态
  else if (explorationState.value && explorationState.value.status === 'completed') explorationProgress.value = 100
  // 加载探索历史
  explorationHistory.value = explorationStore.explorationHistory
}

// 开始探索
const startExploration = async (area) => {
  if (explorationState.value && explorationState.value.status === 'exploring') {
    showToast('已有正在进行的探索')
    return
  }
  // 确认开始探索
  showDialog({
    title: '开始探索',
    message: `确定要探索${area.name}吗？需要消耗${area.energyCost}点体力。`,
    showCancelButton: true,
    confirmButtonText: '确定',
    cancelButtonText: '取消',
  }).then(async () => {
    // 开始探索
    const result = await explorationStore.startExploration(
      area.id,
      resources.value.level,
      resources.value.energy
    )
    if (result.success) {
      // 更新探索状态
      explorationState.value = result.state
      selectedArea.value = area
      // 更新体力
      resources.value.energy -= area.energyCost
      // 保存游戏状态
      const gameState = await gameStore.loadGameState()
      if (gameState) {
        gameState.resources.energy = resources.value.energy
        await gameStore.saveGameState(gameState)
      }
      // 启动进度计时器
      startProgressTimer()
      showToast(result.message)
    } else {
      showToast(result.message)
    }
  }).catch(() => {
    // 取消探索
  })
}

// 启动进度计时器
const startProgressTimer = () => {
  // 清除现有计时器
  if (progressTimer.value) clearInterval(progressTimer.value)
  // 创建新计时器，每秒更新进度
  progressTimer.value = setInterval(() => {
    // 获取当前进度
    explorationProgress.value = explorationStore.getExplorationProgress()
    // 检查是否完成
    if (explorationProgress.value >= 100) {
      clearInterval(progressTimer.value)
      completeExploration()
    }
  }, 1000)
}

// 完成探索
const completeExploration = async () => {
  if (!explorationState.value || explorationState.value.status !== 'exploring') return
  // 完成探索
  const result = await explorationStore.completeExploration()
  if (result.success) {
    // 更新探索状态
    explorationState.value = explorationStore.explorationState
    explorationProgress.value = 100
    dialogVisible.value = true
    resultData.value = result
  } else {
    showToast(result.message)
  }
}

// 获取事件图标
const getEventIcon = (eventType) => {
  switch (eventType) {
    case explorationStore.EVENT_TYPES.BATTLE:
      return 'shield-o';
    case explorationStore.EVENT_TYPES.TREASURE:
      return 'gift-o';
    case explorationStore.EVENT_TYPES.PUZZLE:
      return 'question-o';
    case explorationStore.EVENT_TYPES.MERCHANT:
      return 'cart-o';
    case explorationStore.EVENT_TYPES.TRAP:
      return 'warning-o';
    case explorationStore.EVENT_TYPES.BLESSING:
      return 'like-o';
    default:
      return 'info-o';
  }
}

// 获取事件颜色
const getEventColor = (eventType) => {
  switch (eventType) {
    case explorationStore.EVENT_TYPES.BATTLE:
      return '#F44336';
    case explorationStore.EVENT_TYPES.TREASURE:
      return '#FFD700';
    case explorationStore.EVENT_TYPES.PUZZLE:
      return '#9C27B0';
    case explorationStore.EVENT_TYPES.MERCHANT:
      return '#2196F3';
    case explorationStore.EVENT_TYPES.TRAP:
      return '#FF5722';
    case explorationStore.EVENT_TYPES.BLESSING:
      return '#4CAF50';
    default:
      return '#000000';
  }
}

// 获取物品类型图标
const getItemTypeIcon = (itemType) => {
  switch (itemType) {
    case 'weapon':
      return 'fire-o';
    case 'armor':
      return 'shield-o';
    case 'helmet':
      return 'gem-o';
    case 'accessory':
      return 'gem-o';
    case 'material':
      return 'bag-o';
    default:
      return 'gift-o';
  }
}

// 获取物品类型颜色
const getItemTypeColor = (itemType) => {
  switch (itemType) {
    case 'weapon':
      return '#F44336';
    case 'armor':
      return '#2196F3';
    case 'helmet':
      return '#9C27B0';
    case 'accessory':
      return '#FFD700';
    case 'material':
      return '#4CAF50';
    default:
      return '#000000';
  }
}

// 获取属性名称
const getStatName = (statKey) => {
  switch (statKey) {
    case 'attack':
      return '攻击';
    case 'defense':
      return '防御';
    case 'health':
      return '生命';
    case 'speed':
      return '速度';
    case 'critical':
      return '暴击';
    default:
      return statKey;
  }
}

// 领取奖励
const claimRewards = async () => {
  if (!explorationState.value || explorationState.value.status !== 'completed') {
    showToast('没有可领取的探索奖励')
    return
  }
  // 领取奖励
  const result = await explorationStore.claimExplorationRewards()
  dialogVisible.value = false
  resultData.value = {}
  if (result.success) {
    // 更新探索状态
    explorationState.value = explorationStore.explorationState
    // 更新资源
    const gameState = await gameStore.loadGameState()
    if (gameState) {
      resources.value.gold = gameState.resources.gold
      resources.value.experience = gameState.resources.experience
    }
    // 添加装备到装备库
    if (result.items && result.items.length > 0) {
      for (const item of result.items) {
        await equipmentStore.addEquipment(item)
      }
    }
    showToast(result.message)
  } else {
    showToast(result.message)
  }
}

// 计算区域类型图标
const getAreaTypeIcon = (type) => {
  switch (type) {
    case explorationStore.AREA_TYPES.FOREST:
      return 'flower-o';
    case explorationStore.AREA_TYPES.MOUNTAIN:
      return 'wap-nav';
    case explorationStore.AREA_TYPES.CAVE:
      return 'underway-o';
    case explorationStore.AREA_TYPES.DESERT:
      return 'fire-o';
    case explorationStore.AREA_TYPES.OCEAN:
      return 'water-o';
    case explorationStore.AREA_TYPES.RUINS:
      return 'gem-o';
    default:
      return 'location-o';
  }
}

// 计算区域类型颜色
const getAreaTypeColor = (type) => {
  switch (type) {
    case explorationStore.AREA_TYPES.FOREST:
      return '#4CAF50';
    case explorationStore.AREA_TYPES.MOUNTAIN:
      return '#795548';
    case explorationStore.AREA_TYPES.CAVE:
      return '#607D8B';
    case explorationStore.AREA_TYPES.DESERT:
      return '#FF9800';
    case explorationStore.AREA_TYPES.OCEAN:
      return '#2196F3';
    case explorationStore.AREA_TYPES.RUINS:
      return '#9C27B0';
    default:
      return '#000000';
  }
}

// 获取区域类型名称
const getAreaTypeName = (type) => {
  switch (type) {
    case explorationStore.AREA_TYPES.FOREST:
      return '森林';
    case explorationStore.AREA_TYPES.MOUNTAIN:
      return '山脉';
    case explorationStore.AREA_TYPES.CAVE:
      return '洞穴';
    case explorationStore.AREA_TYPES.DESERT:
      return '沙漠';
    case explorationStore.AREA_TYPES.OCEAN:
      return '海洋';
    case explorationStore.AREA_TYPES.RUINS:
      return '遗迹';
    default:
      return '未知';
  }
}

// 格式化时间
const formatTime = (timestamp) => {
  const date = new Date(timestamp)
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
}

// 解锁区域
const unlockArea = async (areaId) => {
  // 确认解锁区域
  showDialog({
    title: '解锁区域',
    message: '确定要解锁这个区域吗？',
    showCancelButton: true,
    confirmButtonText: '确定',
    cancelButtonText: '取消',
  }).then(async () => {
    // 解锁区域
    const result = await explorationStore.unlockArea(areaId)
    // 重新加载区域数据
    if (result.success) areas.value = explorationStore.getAvailableAreas(resources.value.level)
    showToast(result.message)
  }).catch(() => {
    // 取消解锁
  })
}

// 生命周期钩子
onMounted(() => loadData())

onUnmounted(() => {
  // 清除计时器
  if (progressTimer.value) clearInterval(progressTimer.value)
})
</script>

<template>
  <div class="exploration-container">
    <div class="exploration-header">
      <div class="back-button">
        <van-button icon="arrow-left" size="small" @click="router.push('/')">返回</van-button>
      </div>
      <div class="resource-panel">
        <div class="resource">
          <span class="resource-label">金币</span>
          <span class="resource-value">{{ resources.gold }}</span>
        </div>
        <div class="resource">
          <span class="resource-label">体力</span>
          <span class="resource-value">{{ resources.energy }}</span>
        </div>
        <div class="resource">
          <span class="resource-label">等级</span>
          <span class="resource-value">{{ resources.level }}</span>
        </div>
      </div>
    </div>
    <van-tabs v-model:active="activeTab" animated swipeable>
      <!-- 探索区域标签页 -->
      <van-tab title="探索区域">
        <!-- 当前探索状态 -->
        <div class="current-exploration"
          v-if="explorationState && (explorationState.status === 'exploring' || explorationState.status === 'completed')">
          <h3>当前探索</h3>
          <div class="exploration-status">
            <div class="area-info">
              <van-icon :name="getAreaTypeIcon(explorationState.area.type)"
                :color="getAreaTypeColor(explorationState.area.type)" size="24" />
              <span class="area-name">{{ explorationState.area.name }}</span>
            </div>
            <div class="exploration-progress-wrapper">
              <van-progress :percentage="explorationProgress" :show-pivot="true" color="#2db7f5" />
              <div class="exploration-actions" v-if="explorationState.status === 'completed'">
                <van-button type="primary" size="small" @click="claimRewards">领取奖励</van-button>
              </div>
            </div>
          </div>
        </div>
        <!-- 可用探索区域列表 -->
        <div class="area-list">
          <h3>可探索区域</h3>
          <van-cell-group inset>
            <van-cell v-for="area in areas" :key="area.id">
              <template #title>
                <div class="area-title">
                  <van-icon :name="getAreaTypeIcon(area.type)" :color="getAreaTypeColor(area.type)" size="18" />
                  <span>{{ area.name }}</span>
                  <van-tag v-if="!area.unlocked" type="danger" size="medium">未解锁</van-tag>
                  <van-tag v-else-if="area.type" :color="getAreaTypeColor(area.type)"
                    size="medium">{{ getAreaTypeName(area.type) }}</van-tag>
                </div>
              </template>
              <template #label>
                <div class="area-description">{{ area.description }}</div>
                <div class="area-requirements">
                  <span>需求等级: {{ area.minLevel }}</span>
                  <span>体力消耗: {{ area.energyCost }}</span>
                </div>
              </template>
              <template #right-icon>
                <van-button v-if="area.unlocked" size="small" type="primary" @click="startExploration(area)">
                  探索
                </van-button>
                <van-button v-else-if="resources.level >= area.minLevel" size="small" type="warning"
                  @click.stop="unlockArea(area.id)">
                  解锁
                </van-button>
                <van-button v-else size="small" type="default" disabled>
                  等级不足
                </van-button>
              </template>
            </van-cell>
          </van-cell-group>
        </div>
      </van-tab>
      <!-- 探索历史标签页 -->
      <van-tab title="探索历史">
        <div class="history-list" v-if="explorationHistory && explorationHistory.length > 0">
          <van-cell-group inset v-for="(record, index) in explorationHistory" :key="record.id"
            :style="{ marginBottom: index < explorationHistory.length - 1 ? '16px!important' : '0' }">
            <van-cell>
              <template #title>
                <div class="history-title">
                  <van-icon :name="getAreaTypeIcon(record.areaType || 'forest')"
                    :color="getAreaTypeColor(record.areaType || 'forest')" size="18" />
                  <span>{{ record.areaName }}</span>
                </div>
              </template>
              <template #label>
                <div class="history-time">{{ formatTime(record.completedTime) }}</div>
                <div class="history-rewards">
                  <span>获得奖励: {{ record.rewards.gold }} 金币, {{ record.rewards.experience }} 经验</span>
                </div>
                <div class="history-events" v-if="record.events && record.events.length > 0">
                  <div>遭遇事件:</div>
                  <div v-for="event in record.events" :key="event.type" class="history-event-item">
                    - {{ event.description }}
                  </div>
                </div>
                <div class="history-items" v-if="record.items && record.items.length > 0">
                  <div>获得物品:</div>
                  <div v-for="item in record.items" :key="item.id" class="history-item-entry">
                    - {{ item.name }}
                    <span v-if="item.type === 'weapon' || item.type === 'armor' || item.type === 'accessory'"
                      class="item-stats">
                      ({{ Object.entries(item.stats).map(([key, value]) => `${getStatName(key)}: ${value}`).join(', ') }})
                    </span>
                  </div>
                </div>
              </template>
            </van-cell>
          </van-cell-group>
        </div>
        <div class="empty-state" v-else>
          <van-empty description="暂无探索历史" />
        </div>
      </van-tab>
    </van-tabs>
    <div class="exploration-info">
      <h3>探索说明</h3>
      <p>探索不同区域可以获得金币、经验和稀有装备。探索过程中可能遭遇各种事件，带来额外奖励或挑战。</p>
    </div>
    <van-dialog v-model:show="dialogVisible" title="探索完成" confirm-button-text="领取奖励" @confirm="claimRewards">
      <div class="exploration-result" v-if="dialogVisible">
        <div class="result-section">
          <div class="reward-item">
            <van-icon name="gold-coin-o" color="#FFD700" /> {{ resultData.rewards.gold }} 金币
          </div>
          <div class="reward-item">
            <van-icon name="star-o" color="#2196F3" /> {{ resultData.rewards.experience }} 经验
          </div>
        </div>
        <div class="result-section" v-if="resultData.events && resultData.events.length > 0">
          <h4>遭遇事件</h4>
          <div class="event-item" v-for="event in resultData.events" :key="event.type">
            <div class="event-item">
              <van-icon :name="getEventIcon(event.type)" :color="getEventColor(event.type)" /> {{ event.description }}
            </div>
          </div>
        </div>
        <div class="result-section" v-if="resultData.items && resultData.items.length > 0">
          <h4>获得物品</h4>
          <div class="event-item" v-for="item in resultData.items" :key="item.type">
            <div class="event-item">
              <van-icon :name="getItemTypeIcon(item.type)" :color="getItemTypeColor(item.type)" /> {{ item.name }}
              <template v-if="item.stats">
                <div class="item-stats" v-for="key in Object.entries(item.stats)" :key="key">
                  <span>{{ Object.entries(item.stats).map(([key, value]) => `${getStatName(key)}: ${value}`).join(', ') }}</span>
                </div>
              </template>
            </div>
          </div>
        </div>
      </div>
    </van-dialog>
  </div>
</template>

<style scoped>
.exploration-container {
  display: flex;
  flex-direction: column;
  padding: 16px;
}

.exploration-header {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 24px;
}

.back-button {
  margin-bottom: 8px;
}

.resource-panel {
  display: flex;
  justify-content: space-between;
  background-color: var(--van-cell-background);
  padding: 12px;
  border-radius: 8px;
}

.resource {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.resource-label {
  font-size: 0.8rem;
  color: #646566;
}

.resource-value {
  font-size: 1.1rem;
  font-weight: bold;
  color: var(--van-cell-text-color);
}

.current-exploration {
  margin-top: 16px;
  margin-bottom: 24px;
  background-color: var(--van-cell-background);
  padding: 16px;
  border-radius: 8px;
}

.exploration-status {
  margin-top: 12px;
}

.area-info {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}

.area-name {
  margin-left: 8px;
  font-weight: bold;
}

.exploration-progress-wrapper {
  margin-top: 8px;
}

.exploration-actions {
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
}

.area-list {
  margin-top: 16px;
}

.area-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.area-description {
  margin-top: 4px;
  margin-bottom: 8px;
  font-size: 0.9rem;
}

.area-requirements {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  color: #646566;
}

.history-list {
  margin-top: 16px;
}

.history-title {
  font-weight: bold;
  display: flex;
  align-items: center;
  gap: 8px;
}

.history-time {
  font-size: 0.8rem;
  color: #646566;
  margin-bottom: 4px;
}

.history-rewards,
.history-items {
  font-size: 0.9rem;
  margin-top: 4px;
}

.history-events {
  font-size: 0.9rem;
  margin-top: 4px;
}

.history-event-item,
.history-item-entry {
  margin-left: 12px;
  margin-top: 2px;
}

.item-stats {
  font-size: 0.8rem;
  color: #646566;
  margin-left: 4px;
}

.empty-state {
  margin-top: 32px;
}

.exploration-info {
  margin-top: 24px;
  background-color: var(--van-cell-background);
  padding: 16px;
  border-radius: 8px;
}

.exploration-info h3 {
  margin-top: 0;
  margin-bottom: 8px;
}

.exploration-info p {
  margin: 0;
  font-size: 0.9rem;
  color: #646566;
}

/* 探索结果样式 */
.exploration-result {
  font-size: 0.9rem;
  line-height: 1.5;
  text-align: center;
}

.result-section {
  margin-bottom: 12px;
}

.result-section h4 {
  margin: 8px 0;
  font-size: 1rem;
}

.reward-item,
.event-item,
.item-drop {
  display: flex;
  align-items: center;
  margin: 4px 0;
  gap: 6px;
  justify-content: center;
}

.item-stats {
  margin-left: 24px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 0.8rem;
  color: #646566;
}

.item-stats span {
  background-color: rgba(0, 0, 0, 0.05);
  padding: 2px 6px;
  border-radius: 4px;
}
</style>