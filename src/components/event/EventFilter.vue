<!--
  演出筛选条（components/event/EventFilter.vue）
  知识点：
  1. 关键词搜索：el-input + 防抖（300ms）
  2. 城市下拉：el-select，option 来自父组件传入
  3. 分类筛选：el-select
  4. 状态筛选：el-select（仅管理端用）
  5. 价格区间筛选：两个 el-input-number（单位：元），PRD 8.3
  6. 排序：el-select，sort=heat_desc/time_desc/price_asc/price_desc
  7. v-model 透传：父组件直接绑定 modelValue
-->
<script setup lang="ts">
import { watch } from 'vue'
import { ElInput, ElSelect, ElOption, ElInputNumber } from 'element-plus'
import type { EventStatus, EventSort } from '@/api/types'

interface Props {
  keyword?: string
  city?: string
  category?: string
  status?: EventStatus | ''
  cities?: string[]
  categories?: string[]
  /** 是否显示状态筛选（管理端用） */
  showStatus?: boolean
  /** 是否显示价格区间与排序（C 端用） */
  showPriceSort?: boolean
  /** 价格下限（单位：元） */
  minPrice?: number | undefined
  /** 价格上限（单位：元） */
  maxPrice?: number | undefined
  /** 排序方式 */
  sort?: EventSort | ''
}

const props = withDefaults(defineProps<Props>(), {
  keyword: '',
  city: '',
  category: '',
  status: '',
  cities: () => [],
  categories: () => [],
  showStatus: false,
  showPriceSort: false,
  minPrice: undefined,
  maxPrice: undefined,
  sort: ''
})

const emit = defineEmits<{
  (e: 'update:keyword', val: string): void
  (e: 'update:city', val: string): void
  (e: 'update:category', val: string): void
  (e: 'update:status', val: EventStatus | ''): void
  (e: 'update:minPrice', val: number | undefined): void
  (e: 'update:maxPrice', val: number | undefined): void
  (e: 'update:sort', val: EventSort | ''): void
  (e: 'search'): void
}>()

let debounceTimer: number | null = null
watch(
  () => props.keyword,
  () => {
    if (debounceTimer) window.clearTimeout(debounceTimer)
    debounceTimer = window.setTimeout(() => emit('search'), 300)
  }
)
</script>

<template>
  <div class="event-filter">
    <el-input
      :model-value="props.keyword"
      placeholder="搜索演出名称"
      clearable
      class="filter-item keyword"
      @update:model-value="(val: string) => emit('update:keyword', val)"
    />
    <el-select
      v-if="props.cities.length"
      :model-value="props.city"
      placeholder="全部城市"
      clearable
      class="filter-item"
      @update:model-value="(val: string) => emit('update:city', val)"
    >
      <el-option v-for="c in props.cities" :key="c" :label="c" :value="c" />
    </el-select>
    <el-select
      v-if="props.categories.length"
      :model-value="props.category"
      placeholder="全部分类"
      clearable
      class="filter-item"
      @update:model-value="(val: string) => emit('update:category', val)"
    >
      <el-option v-for="c in props.categories" :key="c" :label="c" :value="c" />
    </el-select>
    <el-select
      v-if="props.showStatus"
      :model-value="props.status"
      placeholder="全部状态"
      clearable
      class="filter-item"
      @update:model-value="(val: EventStatus | '') => emit('update:status', val || '')"
    >
      <el-option label="未上架" value="DRAFT" />
      <el-option label="在售" value="ON_SALE" />
      <el-option label="售罄" value="SOLD_OUT" />
      <el-option label="已结束" value="END" />
    </el-select>

    <template v-if="props.showPriceSort">
      <el-input-number
        :model-value="props.minPrice"
        :min="0"
        :precision="0"
        :controls="false"
        placeholder="最低价"
        class="filter-item price-input"
        @update:model-value="(val: number | undefined) => emit('update:minPrice', val)"
      />
      <span class="price-sep">-</span>
      <el-input-number
        :model-value="props.maxPrice"
        :min="0"
        :precision="0"
        :controls="false"
        placeholder="最高价"
        class="filter-item price-input"
        @update:model-value="(val: number | undefined) => emit('update:maxPrice', val)"
      />
      <el-select
        :model-value="props.sort"
        placeholder="排序"
        clearable
        class="filter-item sort-select"
        @update:model-value="(val: EventSort | '') => emit('update:sort', val || '')"
      >
        <el-option label="综合排序" value="heat_desc" />
        <el-option label="最新优先" value="time_desc" />
        <el-option label="价格从低到高" value="price_asc" />
        <el-option label="价格从高到低" value="price_desc" />
      </el-select>
      <el-button type="primary" plain @click="emit('search')">筛选</el-button>
    </template>
  </div>
</template>

<style scoped lang="scss">
.event-filter {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 16px;
  align-items: center;
}
.filter-item {
  width: 180px;
}
.keyword {
  width: 240px;
}
.price-input {
  width: 96px;
}
.price-sep {
  color: var(--color-text-placeholder);
}
.sort-select {
  width: 160px;
}
@media (max-width: $bp-tablet) {
  .event-filter {
    gap: 8px;
  }
  .keyword {
    width: 100%;
    order: -1; /* 搜索框放最前 */
  }
  .filter-item {
    width: calc(50% - 4px);
  }
  /* 价格区间在移动端合并到一行 */
  .price-input {
    width: calc(50% - 16px);
  }
  .sort-select {
    width: 100%;
  }
}
@media (max-width: $bp-mobile) {
  .filter-item,
  .price-input,
  .sort-select {
    width: 100%;
  }
  .price-sep {
    display: none;
  }
}
</style>
