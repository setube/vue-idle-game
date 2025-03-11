<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { usePetStore } from '../stores/pets'
import { useGameStore } from '../stores/game'
import { showToast } from 'vant'

const router = useRouter()
const petStore = usePetStore()
const gameStore = useGameStore()

// 宠物列表
const pets = ref([])
// 当前选中的宠物
const selectedPet = ref(null)
// 玩家资源
const resources = ref({
  gold: 0
})
// 重命名对话框
const showRenameDialog = ref(false)
const newPetName = ref('')
// 喂食数量
const feedAmount = ref(10)

// 加载宠物数据
const loadPetData = async () => {
  await petStore.initialize()
  pets.value = petStore.availablePets
  // 加载玩家资源
  const gameState = await gameStore.loadGameState()
  if (gameState) resources.value.gold = gameState.resources.gold
}

// 选择宠物
const selectPet = (pet) => {
  selectedPet.value = pet
}

// 激活宠物
const activatePet = async (petId) => {
  const result = await petStore.activatePet(petId)
  if (result) {
    showToast('宠物已激活')
    await loadPetData()
  }
}

// 打开重命名对话框
const openRenameDialog = (pet) => {
  selectedPet.value = pet
  newPetName.value = pet.name
  showRenameDialog.value = true
}

// 重命名宠物
const renamePet = async () => {
  if (!newPetName.value.trim()) {
    showToast('名称不能为空')
    return
  }
  const result = await petStore.renamePet(selectedPet.value.id, newPetName.value)
  if (result.success) {
    showRenameDialog.value = false
    await loadPetData()
  }
  showToast(result.message)
}

// 喂食宠物
const feedPet = async (pet) => {
  // 检查金币是否足够
  const cost = feedAmount.value
  if (resources.value.gold < cost) {
    showToast('金币不足')
    return
  }
  // 扣除金币
  const gameState = await gameStore.loadGameState()
  gameState.resources.gold -= cost
  await gameStore.saveGameState(gameState)
  // 喂食宠物
  const result = await petStore.feedPet(pet.id, feedAmount.value)
  showToast(result.message)
  // 重新加载数据
  if (result.success) await loadPetData()
}

// 获取宠物稀有度样式
const getRarityStyle = (rarity) => {
  switch (rarity) {
    case petStore.RARITY.COMMON:
      return { color: '#9e9e9e' }
    case petStore.RARITY.UNCOMMON:
      return { color: '#4caf50' }
    case petStore.RARITY.RARE:
      return { color: '#2196f3' }
    case petStore.RARITY.EPIC:
      return { color: '#9c27b0' }
    case petStore.RARITY.LEGENDARY:
      return { color: '#ff9800' }
    default:
      return {}
  }
}

// 获取宠物类型图标
const getPetTypeIcon = (type) => {
  switch (type) {
    case petStore.PET_TYPES.ATTACK:
      return 'fire-o'
    case petStore.PET_TYPES.DEFENSE:
      return 'shield-o'
    case petStore.PET_TYPES.UTILITY:
      return 'magic-stick-o'
    case petStore.PET_TYPES.GOLD:
      return 'gold-coin-o'
    case petStore.PET_TYPES.ENERGY:
      return 'lightning-o'
    default:
      return 'question-o'
  }
}

// 属性加成映射
const getPetStat = {
  energySave: '体力',
  goldBoost: '金币',
  expBoost: '经验',
  attackBoost: '攻击',
  defenseBoost: '防御'
}

// 计算宠物经验百分比
const calculateExpPercentage = (pet) => {
  return Math.floor((pet.experience / pet.maxExperience) * 100)
}

// 生命周期钩子
onMounted(() => {
  loadPetData()
})
</script>

<template>
  <div class="pets-container">
    <div class="pets-header">
      <div class="back-button">
        <van-button icon="arrow-left" size="small" @click="router.go(-1)">返回</van-button>
      </div>
      <div class="resource-display">
        <span class="gold"><van-icon name="gold-coin-o" /> {{ resources.gold }}</span>
      </div>
    </div>
    <div class="pets-content">
      <div v-if="pets.length === 0" class="empty-state">
        <van-empty description="你还没有宠物" />
        <p class="empty-tip">完成任务和探索有机会获得宠物</p>
      </div>
      <div v-else class="pet-list">
        <van-cell-group inset>
          <van-cell v-for="pet in pets" :key="pet.id" @click="selectPet(pet)" :class="{ 'active-pet': pet.active }">
            <template #title>
              <div class="pet-title">
                <van-icon :name="getPetTypeIcon(pet.type)" class="pet-type-icon" />
                <span>{{ pet.name }}</span>
                <van-tag :color="getRarityStyle(pet.rarity).color">{{ petStore.getRarityName(pet.rarity) }}</van-tag>
              </div>
            </template>
            <template #label>
              <div class="pet-info">
                <div class="pet-level">等级: {{ pet.level }}</div>
                <div class="pet-exp">
                  <span>经验: {{ pet.experience }}/{{ pet.maxExperience }}</span>
                  <van-progress :percentage="calculateExpPercentage(pet)" :show-pivot="false" />
                </div>
                <div class="pet-stats">
                  <div v-for="(value, stat) in pet.stats" :key="stat" class="pet-stat">
                    {{ getPetStat[stat] }}: {{ value }}%
                  </div>
                </div>
              </div>
            </template>
            <template #right-icon>
              <div class="pet-actions">
                <van-button size="small" type="primary" @click.stop="activatePet(pet.id)"
                  :disabled="pet.active">{{ pet.active ? '已激活' : '激活' }}</van-button>
                <van-button size="small" type="default" @click.stop="openRenameDialog(pet)">重命名</van-button>
                <van-button size="small" type="success" @click.stop="feedPet(pet)">喂食 ({{ feedAmount }}金币)</van-button>
              </div>
            </template>
          </van-cell>
        </van-cell-group>
      </div>
      <div v-if="selectedPet" class="pet-details">
        <h3>{{ selectedPet.name }} 详情</h3>
        <div class="pet-detail-info">
          <div class="pet-detail-item">
            <span class="label">类型:</span>
            <span class="value">{{ petStore.getPetTypeName(selectedPet.type) }}</span>
          </div>
          <div class="pet-detail-item">
            <span class="label">稀有度:</span>
            <span class="value" :style="getRarityStyle(selectedPet.rarity)">
              {{ petStore.getRarityName(selectedPet.rarity) }}
            </span>
          </div>
          <div class="pet-detail-item">
            <span class="label">等级:</span>
            <span class="value">{{ selectedPet.level }}</span>
          </div>
          <div class="pet-detail-item">
            <span class="label">捕获时间:</span>
            <span class="value">{{ new Date(selectedPet.capturedAt).toLocaleString() }}</span>
          </div>
        </div>
        <h4>属性加成</h4>
        <div class="pet-stats-detail">
          <div v-for="(value, stat) in selectedPet.stats" :key="stat" class="pet-stat-detail">
            <span class="stat-name">{{ getPetStat[stat] }}:</span>
            <span class="stat-value">{{ value }}%</span>
          </div>
        </div>
        <h4>技能</h4>
        <div class="pet-skills">
          <div v-if="selectedPet.skills && selectedPet.skills.length > 0">
            <div v-for="skill in selectedPet.skills" :key="skill.id" class="pet-skill">
              <span class="skill-name">{{ skill.name }}:</span>
              <span class="skill-desc">{{ skill.description }}</span>
            </div>
          </div>
          <div v-else class="no-skills">
            该宠物暂无特殊技能
          </div>
        </div>
      </div>
    </div>
    <van-dialog v-model:show="showRenameDialog" title="重命名宠物" show-cancel-button @confirm="renamePet">
      <van-field v-model="newPetName" label="新名称" placeholder="请输入新名称" :maxlength="20" />
    </van-dialog>
  </div>
</template>

<style scoped>
.pets-container {
  display: flex;
  flex-direction: column;
  padding: 16px;
}

.pets-header {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 24px;
}

.back-button {
  margin-bottom: 8px;
}

.resource-display {
  display: flex;
  justify-content: flex-end;
  font-size: 1.1rem;
  font-weight: bold;
}

.gold {
  color: #ff9800;
}

.pets-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 32px;
}

.empty-tip {
  color: #969799;
  margin-top: 8px;
}

.pet-list {
  margin-bottom: 16px;
}

.pet-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pet-type-icon {
  margin-right: 4px;
}

.pet-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 90%;
}

.pet-level {
  font-weight: bold;
}

.pet-exp {
  font-size: 0.8rem;
  margin: 4px 0;
}

.pet-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 0.8rem;
}

.pet-stat {
  background-color: #f2f3f5;
  padding: 2px 6px;
  border-radius: 4px;
}

.pet-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.active-pet {
  background-color: rgba(25, 137, 250, 0.05);
}

.pet-details {
  background-color: var(--van-cell-background);
  padding: 16px;
  border-radius: 8px;
  margin-top: 16px;
}

.pet-detail-info {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin: 12px 0;
}

.pet-detail-item {
  display: flex;
  align-items: center;
}

.label {
  color: #646566;
  margin-right: 8px;
}

.pet-stats-detail,
.pet-skills {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 12px 0;
}

.pet-stat-detail,
.pet-skill {
  display: flex;
  align-items: center;
}

.stat-name,
.skill-name {
  color: #646566;
}

.no-skills {
  color: #969799;
  font-style: italic;
}
</style>