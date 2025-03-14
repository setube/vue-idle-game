<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useEquipmentStore } from '../stores/equipment'
import { useGameStore } from '../stores/game'
import { showToast, showDialog } from 'vant'

const router = useRouter()
const equipmentStore = useEquipmentStore()
const gameStore = useGameStore()

// 玩家资源
const resources = ref({
  gold: 0,
  level: 1
})

// 装备数据
const equipments = ref([])
const equippedItems = ref({})
const activeTab = ref('ALL')
const activeTab2 = ref(0)

// 筛选类型
const filterType = ref('')

// 加载数据
const loadData = async () => {
  // 初始化装备系统
  await equipmentStore.initialize()
  // 加载玩家资源
  const gameState = await gameStore.loadGameState()
  if (gameState) {
    resources.value.gold = gameState.resources.gold
    resources.value.level = gameState.level
  }
  // 加载装备数据
  equipments.value = equipmentStore.equipments
  equippedItems.value = equipmentStore.getEquippedItems()
}

// 装备物品
const equipItem = async (item) => {
  const result = await equipmentStore.equipItem(item.id)
  // 刷新装备数据
  if (result.success) equippedItems.value = equipmentStore.getEquippedItems()
  showToast(result.message)
}

// 卸下装备
const unequipItem = async (type) => {
  const result = await equipmentStore.unequipItem(type)
  // 刷新装备数据
  if (result.success) equippedItems.value = equipmentStore.getEquippedItems()
  showToast(result.message)
}

// 出售装备
const sellItem = async (item) => {
  showDialog({
    title: '出售装备',
    message: `确定要出售 ${item.name} 吗？`,
    showCancelButton: true,
    confirmButtonText: '确定',
    cancelButtonText: '取消',
  }).then(async () => {
    const result = await equipmentStore.sellEquipment(item.id)
    if (result.success) {
      // 刷新装备数据
      equipments.value = equipmentStore.equipments
      // 刷新资源
      const gameState = await gameStore.loadGameState()
      if (gameState) resources.value.gold = gameState.resources.gold
    }
    showToast(result.message)
  }).catch(() => {
    // 取消出售
  })
}

// 强化装备
const enhanceItem = async (item) => {
  // 获取可用的材料
  const materials = equipments.value.filter(e => e.type === 'material')
  if (materials.length === 0) {
    showToast('没有可用的强化材料')
    return
  }
  // 显示材料选择对话框
  showDialog({
    title: '选择强化材料',
    message: '请选择要用于强化的材料',
    showCancelButton: true,
    confirmButtonText: '确定',
    cancelButtonText: '取消',
  }).then(async () => {
    // 这里简化处理，使用第一个材料进行强化
    const materialId = materials[0].id
    const result = await equipmentStore.enhanceEquipment(item.id, [materialId])
    if (result.success) {
      // 刷新装备数据
      equipments.value = equipmentStore.equipments
      equippedItems.value = equipmentStore.getEquippedItems()
    }
    showToast(result.message)
  }).catch(() => {
    // 取消强化
  })
}

// 获取装备类型名称
const getEquipmentTypeName = (type) => {
  const typeNames = {
    [equipmentStore.EQUIPMENT_TYPES.WEAPON]: '武器',
    [equipmentStore.EQUIPMENT_TYPES.HELMET]: '头盔',
    [equipmentStore.EQUIPMENT_TYPES.ARMOR]: '护甲',
    [equipmentStore.EQUIPMENT_TYPES.SHIELD]: '盾牌',
    [equipmentStore.EQUIPMENT_TYPES.ACCESSORY]: '饰品',
    'material': '材料'
  }
  return typeNames[type] || '未知'
}

// 获取装备稀有度名称
const getRarityName = (rarity) => {
  const rarityNames = {
    [equipmentStore.RARITY.COMMON]: '普通',
    [equipmentStore.RARITY.UNCOMMON]: '优秀',
    [equipmentStore.RARITY.RARE]: '稀有',
    [equipmentStore.RARITY.EPIC]: '史诗',
    [equipmentStore.RARITY.LEGENDARY]: '传说'
  }
  return rarityNames[rarity] || '未知'
}

// 获取装备稀有度颜色
const getRarityColor = (rarity) => {
  return equipmentStore.getRarityColor(rarity)
}

// 获取装备属性描述
const getStatsDescription = (stats) => {
  if (!stats) return ''
  const descriptions = []
  for (const [stat, value] of Object.entries(stats)) {
    let statName = ''
    switch (stat) {
      case 'attack':
        statName = '攻击力'
        break
      case 'defense':
        statName = '防御力'
        break
      case 'health':
        statName = '生命值'
        break
      case 'speed':
        statName = '速度'
        break
      case 'critical':
        statName = '暴击率'
        break
      default:
        statName = stat
    }
    descriptions.push(`${statName}: +${value}`)
  }
  return descriptions.join('，')
}

// 筛选装备
const filteredEquipments = computed(() => {
  if (!filterType.value) return equipments.value.filter(e => e.type !== 'material')
  return equipments.value.filter(e => e.type === filterType.value)
})

// 获取材料
const materials = computed(() => {
  return equipments.value.filter(e => e.type === 'material')
})

// 获取装备统计
const equipmentStats = computed(() => {
  return equipmentStore.getEquippedStats()
})

// 检查物品是否已装备
const isEquipped = (itemId) => {
  console.log(equippedItems.value, itemId)
  return Object.values(equippedItems.value).includes(itemId)
}

const onClickTab = () => {
  filterType.value = activeTab.value === 'ALL' ? '' : equipmentStore.EQUIPMENT_TYPES[activeTab.value]
}

// 生命周期钩子
onMounted(() => loadData())
</script>

<template>
  <div class="equipment-container">
    <div class="equipment-header">
      <div class="back-button">
        <van-button icon="arrow-left" size="small" @click="router.go(-1)">返回</van-button>
      </div>
      <div class="resource-panel">
        <div class="resource">
          <span class="resource-label">金币</span>
          <span class="resource-value">{{ resources.gold }}</span>
        </div>
      </div>
    </div>
    <!-- 已装备物品 -->
    <div class="equipped-items">
      <h3>已装备</h3>
      <div class="equipped-grid">
        <div v-for="(type, index) in Object.keys(equipmentStore.EQUIPMENT_TYPES)" :key="index" class="equipment-slot">
          <div class="slot-name">{{ getEquipmentTypeName(equipmentStore.EQUIPMENT_TYPES[type]) }}</div>
          <div v-if="equippedItems[equipmentStore.EQUIPMENT_TYPES[type]]" class="equipped-item">
            <div class="item-name"
              :style="{color: getRarityColor(equippedItems[equipmentStore.EQUIPMENT_TYPES[type]].rarity)}">
              {{ equippedItems[equipmentStore.EQUIPMENT_TYPES[type]].name }}
            </div>
            <div class="item-stats">
              {{ getStatsDescription(equippedItems[equipmentStore.EQUIPMENT_TYPES[type]].stats) }}
            </div>
            <van-button size="small" type="danger"
              @click="unequipItem(equipmentStore.EQUIPMENT_TYPES[type])">卸下</van-button>
            <van-button size="small" type="success"
              @click="enhanceItem(equipmentStore.EQUIPMENT_TYPES[type])">强化</van-button>
          </div>
          <div v-else class="empty-slot">
            <van-icon name="plus" size="24" />
            <span>空槽</span>
          </div>
        </div>
      </div>
      <!-- 装备属性总和 -->
      <div class="equipment-stats" v-if="Object.values(equipmentStats).some(v => v > 0)">
        <h4>装备属性</h4>
        <div class="stats-list">
          <div v-if="equipmentStats.attack > 0" class="stat-item">
            <span class="stat-name">攻击力</span>
            <span class="stat-value">+{{ equipmentStats.attack }}</span>
          </div>
          <div v-if="equipmentStats.defense > 0" class="stat-item">
            <span class="stat-name">防御力</span>
            <span class="stat-value">+{{ equipmentStats.defense }}</span>
          </div>
          <div v-if="equipmentStats.health > 0" class="stat-item">
            <span class="stat-name">生命值</span>
            <span class="stat-value">+{{ equipmentStats.health }}</span>
          </div>
          <div v-if="equipmentStats.speed > 0" class="stat-item">
            <span class="stat-name">速度</span>
            <span class="stat-value">+{{ equipmentStats.speed }}</span>
          </div>
          <div v-if="equipmentStats.critical > 0" class="stat-item">
            <span class="stat-name">暴击率</span>
            <span class="stat-value">+{{ equipmentStats.critical }}%</span>
          </div>
        </div>
      </div>
    </div>
    <van-tabs v-model:active="activeTab2" animated>
      <!-- 装备背包标签页 -->
      <van-tab title="装备背包" name="0">
        <van-tabs v-model:active="activeTab" @click-tab="onClickTab" animated>
          <!-- 装备背包标签页 -->
          <van-tab title="全部" name="ALL"></van-tab>
          <van-tab title="武器" name="WEAPON"></van-tab>
          <van-tab title="头盔" name="HELMET"></van-tab>
          <van-tab title="护甲" name="ARMOR"></van-tab>
          <van-tab title="盾牌" name="SHIELD"></van-tab>
          <van-tab title="饰品" name="ACCESSORY"></van-tab>
        </van-tabs>
        <!-- 装备列表 -->
        <div class="equipment-list" v-if="filteredEquipments.length > 0">
          <van-cell-group inset>
            <van-cell v-for="item in filteredEquipments" :key="item.id">
              <template #title>
                <div class="item-title" :style="{color: getRarityColor(item.rarity)}">{{ item.name }}</div>
              </template>
              <template #label>
                <div class="item-rarity">
                  <van-tag type="primary" size="small">{{ getEquipmentTypeName(item.type) }}</van-tag>
                  <van-tag type="warning" size="small" v-if="item.enhancement">+{{ item.enhancement }}</van-tag>
                  <van-tag :color="getRarityColor(item.rarity)">{{ getRarityName(item.rarity) }}</van-tag>
                </div>
                <div class="item-stats" v-if="item.stats">
                  {{ getStatsDescription(item.stats) }}
                </div>
              </template>
              <template #right-icon>
                <div class="item-actions">
                  <van-button size="small" type="danger" @click="sellItem(item)">出售</van-button>
                  <van-button 
                    size="small" 
                    type="primary" 
                    @click="equipItem(item)" 
                    :disabled="isEquipped(item.id)"
                  >
                    {{ isEquipped(item.id) ? '已装备' : '装备' }}
                  </van-button>
                </div>
              </template>
            </van-cell>
          </van-cell-group>
        </div>
        <div class="empty-state" v-else>
          <van-empty description="没有装备" />
        </div>
      </van-tab>
      <van-tab title="材料" name="1">
        <!-- 材料列表 -->
        <div class="equipment-list" v-if="materials.length > 0">
          <van-cell-group inset>
            <van-cell v-for="item in materials" :key="item.id">
              <template #title>
                <div class="item-title" :style="{color: getRarityColor(item.rarity)}">{{ item.name }}</div>
              </template>
              <template #label>
                <div class="item-rarity">
                  <van-tag type="primary" size="small">{{ getEquipmentTypeName(item.type) }}</van-tag>
                  <van-tag :color="getRarityColor(item.rarity)">{{ getRarityName(item.rarity) }}</van-tag>
                </div>
                <div class="item-description" v-if="item.value">
                  <span class="material-value"><van-icon name="gold-coin-o" color="#FFD700" /> 价值: {{ item.value }} 金币</span>
                </div>
                <div class="item-description" v-if="item.description">
                  {{ item.description }}
                </div>
              </template>
              <template #right-icon>
                <div class="item-actions">
                  <van-button size="small" type="danger" @click="sellItem(item)">出售</van-button>
                </div>
              </template>
            </van-cell>
          </van-cell-group>
        </div>
        <div class="empty-state" v-else>
          <van-empty description="没有材料" />
        </div>
      </van-tab>
    </van-tabs>
    <div class="equipment-info">
      <h3>装备说明</h3>
      <p>装备可以提升角色属性，稀有度越高的装备属性越好。可以使用材料强化装备，提升装备属性。</p>
    </div>
  </div>
</template>

<style scoped>
.equipment-container {
  display: flex;
  flex-direction: column;
  padding: 16px;
}

.equipment-header {
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

.equipped-items {
  margin-bottom: 24px;
  background-color: var(--van-cell-background);
  padding: 16px;
  border-radius: 8px;
}

.equipped-items h3 {
  margin-top: 0;
  margin-bottom: 16px;
}

.equipped-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 16px;
}

.equipment-slot {
  border: 1px solid #ebedf0;
  border-radius: 8px;
  padding: 8px;
  display: flex;
  flex-direction: column;
}

.slot-name {
  font-size: 0.8rem;
  color: #646566;
  margin-bottom: 8px;
  text-align: center;
}

.equipped-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.item-title {
  font-weight: bold;
  font-size: 1.1rem;
}

.item-name {
  font-weight: bold;
  text-align: center;
}

.item-stats {
  font-size: 0.8rem;
  margin-top: 4px;
  color: #646566;
}

.item-rarity {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 4px;
}

.item-description {
  font-size: 0.8rem;
  margin-top: 4px;
  color: #646566;
}

.material-value {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #FFD700;
}

.item-actions {
  display: flex;
  gap: 8px;
}

.empty-slot {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 80px;
  color: #c8c9cc;
  gap: 8px;
}

.equipment-stats {
  margin-top: 16px;
  border-top: 1px solid #ebedf0;
  padding-top: 16px;
}

.equipment-stats h4 {
  margin-top: 0;
  margin-bottom: 8px;
}

.stats-list {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-name {
  font-size: 0.8rem;
  color: #646566;
}

.stat-value {
  font-weight: bold;
}

.equipment-info {
  margin-top: 24px;
  background-color: var(--van-cell-background);
  padding: 16px;
  border-radius: 8px;
}

.equipment-info h3 {
  margin-top: 0;
  margin-bottom: 8px;
}

.equipment-info p {
  margin: 0;
  font-size: 0.9rem;
  color: #646566;
}
</style>