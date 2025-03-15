<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useSkillStore } from '../stores/skills'
import { showToast } from 'vant'

const router = useRouter()
const skillStore = useSkillStore()

// 技能列表
const skills = ref([])
const activeTab = ref(0)

// 加载技能数据
const loadSkills = async () => {
  await skillStore.initialize()
  skills.value = skillStore.skills
}

// 升级技能
const upgradeSkill = async (skillId) => {
  const result = await skillStore.upgradeSkill(skillId)
  showToast(result.message)
}

// 计算技能效果描述
const getEffectDescription = (skill) => {
  const effect = skill.effect
  const value = effect.valuePerLevel * skill.currentLevel
  switch (effect.type) {
    case 'gold_boost':
      return `金币获取 +${Math.floor(value * 100)}%`
    case 'exp_boost':
      return `经验获取 +${Math.floor(value * 100)}%`
    case 'all_boost':
      return `全部奖励 +${Math.floor(value * 100)}%`
    case 'energy_regen':
      return `体力恢复 +${value}/分钟`
    case 'energy_save':
      return `体力消耗 -${Math.floor(value * 100)}%`
    default:
      return ''
  }
}

// 计算下一级效果描述
const getNextLevelEffect = (skill) => {
  if (skill.currentLevel >= skill.maxLevel) return '已达到最高等级'
  const effect = skill.effect
  const nextValue = effect.valuePerLevel * (skill.currentLevel + 1)
  const increase = effect.valuePerLevel
  switch (effect.type) {
    case 'gold_boost':
      return `金币获取 +${Math.floor(nextValue * 100)}% (↑${Math.floor(increase * 100)}%)`
    case 'exp_boost':
      return `经验获取 +${Math.floor(nextValue * 100)}% (↑${Math.floor(increase * 100)}%)`
    case 'all_boost':
      return `全部奖励 +${Math.floor(nextValue * 100)}% (↑${Math.floor(increase * 100)}%)`
    case 'energy_regen':
      return `体力恢复 +${nextValue}/分钟 (↑${increase}/分钟)`
    case 'energy_save':
      return `体力消耗 -${Math.floor(nextValue * 100)}% (↑${Math.floor(increase * 100)}%)`
    default:
      return ''
  }
}

// 获取升级成本
const getUpgradeCost = (skill) => {
  if (skill.currentLevel >= skill.maxLevel) return null
  return skill.upgradeCost(skill.currentLevel)
}

// 生命周期钩子
onMounted(() => {
  loadSkills()
})
</script>

<template>
  <div class="skills-container">
    <div class="skills-header">
      <div class="back-button">
        <van-button icon="arrow-left" size="small" @click="router.push('/')">返回</van-button>
      </div>
    </div>
    <div class="skills-content">
      <van-tabs v-model:active="activeTab" animated swipeable>
        <van-tab title="所有技能">
          <div class="skill-list">
            <van-cell-group inset v-for="skill in skills" :key="skill.id">
              <van-cell :title="skill.name" :icon="skill.icon">
                <template #label>
                  <div class="skill-description">{{ skill.description }}</div>
                  <div class="skill-effect" v-if="skill.currentLevel > 0">
                    当前效果: {{ getEffectDescription(skill) }}
                  </div>
                  <div class="skill-level">
                    等级: {{ skill.currentLevel }}/{{ skill.maxLevel }}
                  </div>
                  <div class="skill-next-level" v-if="skill.currentLevel < skill.maxLevel">
                    下一级: {{ getNextLevelEffect(skill) }}
                  </div>
                </template>
                <template #right-icon>
                  <div class="upgrade-section">
                    <div class="upgrade-cost" v-if="getUpgradeCost(skill)">
                      {{ getUpgradeCost(skill).gold }}金币
                    </div>
                    <van-button size="small" type="primary" @click="upgradeSkill(skill.id)"
                      :disabled="skill.currentLevel >= skill.maxLevel">
                      {{ skill.currentLevel === 0 ? '解锁' : '升级' }}
                    </van-button>
                  </div>
                </template>
              </van-cell>
            </van-cell-group>
          </div>
        </van-tab>
        <van-tab title="已解锁">
          <div class="skill-list" v-if="skillStore.unlockedSkills.length > 0">
            <van-cell-group inset v-for="skill in skillStore.unlockedSkills" :key="skill.id">
              <van-cell :title="skill.name" :icon="skill.icon">
                <template #label>
                  <div class="skill-description">{{ skill.description }}</div>
                  <div class="skill-effect">
                    当前效果: {{ getEffectDescription(skill) }}
                  </div>
                  <div class="skill-level">
                    等级: {{ skill.currentLevel }}/{{ skill.maxLevel }}
                  </div>
                  <div class="skill-next-level" v-if="skill.currentLevel < skill.maxLevel">
                    下一级: {{ getNextLevelEffect(skill) }}
                  </div>
                </template>
                <template #right-icon>
                  <div class="upgrade-section">
                    <div class="upgrade-cost" v-if="getUpgradeCost(skill)">
                      {{ getUpgradeCost(skill).gold }}金币
                    </div>
                    <van-button size="small" type="primary" @click="upgradeSkill(skill.id)"
                      :disabled="skill.currentLevel >= skill.maxLevel">
                      升级
                    </van-button>
                  </div>
                </template>
              </van-cell>
            </van-cell-group>
          </div>
          <div class="empty-state" v-else>
            <van-empty description="暂无已解锁的技能" />
          </div>
        </van-tab>
      </van-tabs>
    </div>
  </div>
</template>

<style scoped>
.skills-container {
  display: flex;
  flex-direction: column;
  padding: 16px;
}

.skills-header {
  display: flex;
  flex-direction: column;
  margin-bottom: 24px;
}

.back-button {
  margin-bottom: 16px;
}

.skills-header h1 {
  font-size: 1.5rem;
  margin: 0;
}

.skills-content {
  flex: 1;
}

.skill-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 16px;
}

.skill-description {
  margin-bottom: 4px;
}

.skill-effect {
  color: #1989fa;
  font-size: 0.9rem;
  margin-bottom: 2px;
}

.skill-level {
  font-weight: bold;
  margin-bottom: 2px;
}

.skill-next-level {
  color: #07c160;
  font-size: 0.9rem;
}

.upgrade-section {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.upgrade-cost {
  font-size: 0.8rem;
  color: #ff976a;
}

.empty-state {
  margin-top: 32px;
}
</style>