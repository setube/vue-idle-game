<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useShopStore } from '../stores/shop'
import { useGameStore } from '../stores/game'
import { showToast } from 'vant'

const router = useRouter()
const shopStore = useShopStore()
const gameStore = useGameStore()

// 商店物品列表
const items = ref([])
const activeTab = ref(0)

// 玩家资源
const resources = ref({
  gold: 0,
  level: 1
})

// 加载商店数据
const loadShopData = async () => {
  await shopStore.initialize()
  items.value = shopStore.availableItems
  // 加载玩家资源
  const gameState = await gameStore.loadGameState()
  if (gameState) {
    resources.value.gold = gameState.resources.gold
    resources.value.level = gameState.level
  }
}

// 购买物品
const purchaseItem = async (itemId) => {
  const result = await shopStore.purchaseItem(itemId)
  if (result.success) loadShopData()
  showToast(result.message)
}

// 获取物品类型标签
const getItemTypeTag = (item) => {
  const effect = item.effect
  switch (effect.type) {
    case 'resource':
      return '消耗品'
    case 'boost':
      return '临时加成'
    case 'permanent':
      return '永久加成'
    default:
      return '物品'
  }
}

// 获取物品类型颜色
const getItemTypeColor = (item) => {
  const effect = item.effect
  switch (effect.type) {
    case 'resource':
      return 'primary'
    case 'boost':
      return 'warning'
    case 'permanent':
      return 'success'
    default:
      return 'default'
  }
}

// 检查物品是否可购买
const canPurchase = (item) => {
  return resources.value.gold >= item.price &&
    resources.value.level >= item.minLevel &&
    (item.stock === -1 || item.purchased < item.stock)
}

// 生命周期钩子
onMounted(() => {
  loadShopData()
})
</script>

<template>
  <div class="shop-container">
    <div class="shop-header">
      <div class="back-button">
        <van-button icon="arrow-left" size="small" @click="router.push('/')">返回</van-button>
      </div>
      <div class="player-resources">
        <div class="resource">
          <van-icon name="gold-coin" />
          <span>{{ resources.gold }}</span>
        </div>
      </div>
    </div>
    <div class="shop-content">
      <van-tabs v-model:active="activeTab" animated swipeable>
        <van-tab title="所有商品">
          <div class="item-list">
            <template v-if="items.length === 0">
              <van-empty description="暂无商品" />
            </template>
            <template v-else>
              <van-cell-group inset v-for="item in items" :key="item.id">
                <van-cell :title="item.name" :icon="item.icon">
                  <template #label>
                    <div class="item-description">{{ item.description }}</div>
                    <div class="item-meta">
                      <van-tag :type="getItemTypeColor(item)" size="medium">{{ getItemTypeTag(item) }}</van-tag>
                      <span class="item-level" v-if="item.minLevel > 1">等级要求: {{ item.minLevel }}</span>
                    </div>
                  </template>
                  <template #right-icon>
                    <div class="purchase-section">
                      <div class="item-price">
                        <van-icon name="gold-coin" />
                        <span>{{ item.price }}</span>
                      </div>
                      <van-button size="small" type="primary" @click="purchaseItem(item.id)"
                        :disabled="!canPurchase(item)">
                        {{ item.stock !== -1 && item.purchased >= item.stock ? '已售罄' : '购买' }}
                      </van-button>
                    </div>
                  </template>
                </van-cell>
              </van-cell-group>
            </template>
          </div>
        </van-tab>
        <van-tab title="消耗品">
          <div class="item-list">
            <template v-if="items.filter(i => i.effect.type === 'resource').length === 0">
              <van-empty description="暂无消耗品" />
            </template>
            <template v-else>
              <van-cell-group inset v-for="item in items.filter(i => i.effect.type === 'resource')" :key="item.id">
                <van-cell :title="item.name" :icon="item.icon">
                  <template #label>
                    <div class="item-description">{{ item.description }}</div>
                    <div class="item-meta">
                      <van-tag type="primary" size="medium">消耗品</van-tag>
                      <span class="item-level" v-if="item.minLevel > 1">等级要求: {{ item.minLevel }}</span>
                    </div>
                  </template>
                  <template #right-icon>
                    <div class="purchase-section">
                      <div class="item-price">
                        <van-icon name="gold-coin" />
                        <span>{{ item.price }}</span>
                      </div>
                      <van-button size="small" type="primary" @click="purchaseItem(item.id)"
                        :disabled="!canPurchase(item)">
                        购买
                      </van-button>
                    </div>
                  </template>
                </van-cell>
              </van-cell-group>
            </template>
          </div>
        </van-tab>
        <van-tab title="加成道具">
          <div class="item-list">
            <template v-if="items.filter(i => i.effect.type === 'boost' || i.effect.type === 'permanent').length === 0">
              <van-empty description="暂无加成道具" />
            </template>
            <template v-else>
              <van-cell-group inset
                v-for="item in items.filter(i => i.effect.type === 'boost' || i.effect.type === 'permanent')"
                :key="item.id">
                <van-cell :title="item.name" :icon="item.icon">
                  <template #label>
                    <div class="item-description">{{ item.description }}</div>
                    <div class="item-meta">
                      <van-tag :type="getItemTypeColor(item)" size="medium">{{ getItemTypeTag(item) }}</van-tag>
                      <span class="item-level" v-if="item.minLevel > 1">等级要求: {{ item.minLevel }}</span>
                    </div>
                  </template>
                  <template #right-icon>
                    <div class="purchase-section">
                      <div class="item-price">
                        <van-icon name="gold-coin" />
                        <span>{{ item.price }}</span>
                      </div>
                      <van-button size="small" type="primary" @click="purchaseItem(item.id)"
                        :disabled="!canPurchase(item)">
                        {{ item.stock !== -1 && item.purchased >= item.stock ? '已售罄' : '购买' }}
                      </van-button>
                    </div>
                  </template>
                </van-cell>
              </van-cell-group>
            </template>
          </div>
        </van-tab>
      </van-tabs>
    </div>
  </div>
</template>

<style scoped>
.shop-container {
  display: flex;
  flex-direction: column;
  padding: 16px;
}

.shop-header {
  display: flex;
  flex-direction: column;
  margin-bottom: 24px;
}

.back-button {
  margin-bottom: 16px;
}

.shop-header h1 {
  font-size: 1.5rem;
  margin: 0 0 8px 0;
}

.player-resources {
  display: flex;
  gap: 16px;
}

.resource {
  display: flex;
  align-items: center;
  gap: 4px;
  font-weight: bold;
}

.shop-content {
  flex: 1;
}

.item-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 16px;
}

.item-description {
  margin-bottom: 4px;
}

.item-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
}

.item-level {
  font-size: 0.8rem;
  color: #969799;
}

.purchase-section {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.item-price {
  display: flex;
  align-items: center;
  gap: 2px;
  color: #ff976a;
  font-weight: bold;
}
</style>