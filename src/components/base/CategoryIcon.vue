<!--
  分类图标组件（components/base/CategoryIcon.vue）
  知识点：
  1. 自定义 SVG 图标，国庆主题配色（红金）
  2. 通过 name prop 切换不同图标
  3. 用于首页分类导航、筛选等场景
-->
<script setup lang="ts">
interface Props {
  /** 图标名称 */
  name: string
  /** 图标尺寸（px） */
  size?: number
}

withDefaults(defineProps<Props>(), {
  size: 36
})

/** 图标路径映射（SVG path d 属性） */
const ICON_PATHS: Record<string, string> = {
  // 演唱会：麦克风
  concert: 'M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3zm5 9a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2z',
  // 话剧：面具
  drama: 'M4 4h16v12a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V4zm4 4a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm8 0a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM8 13h8a4 4 0 0 1-8 0z',
  // 体育：奖杯
  sport: 'M7 4h10v2h3v3a5 5 0 0 1-4 4.9V16h2v2H6v-2h2v-2.1A5 5 0 0 1 4 9V6h3V4zm2 4H6v1a3 3 0 0 0 3 3V8zm8 0v5a3 3 0 0 0 3-3V9h-3zM10 18h4v2h-4v-2z',
  // 儿童：气球
  kids: 'M12 2a5 5 0 0 0-5 5c0 2.5 2 4 2 6h6c0-2 2-3.5 2-6a5 5 0 0 0-5-5zm-1 11h2l-1 8-1-8z',
  // 展览：画框
  exhibition: 'M4 3h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zm3 11l3-4 2 3 3-5 3 6H7z',
  // 音乐会：音符
  music: 'M9 3v10.55A4 4 0 1 0 11 17V7h4V3H9z',
  // 曲苑杂坛：折扇
  variety: 'M12 3a9 9 0 0 0-9 9c0 2.5 1 4.7 2.6 6.4L12 12l6.4 6.4A9 9 0 0 0 12 3zm5 18.4L5.6 10A7 7 0 0 1 17 21.4z',
  // 舞蹈芭蕾：舞者
  dance: 'M12 3a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm-2 7h4v3l3 5-2 1-2-3-2 3-2-1 3-5v-3z',
  // 二次元：星星
  anime: 'M12 2l2.5 6.5L21 9l-5 4 1.5 6.5L12 16l-5.5 3.5L8 13l-5-4 6.5-.5L12 2z',
  // 旅游展览：飞机
  travel: 'M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z'
}
</script>

<template>
  <svg
    class="cat-icon"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.6"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path :d="ICON_PATHS[name] || ICON_PATHS.concert" />
  </svg>
</template>

<style scoped lang="scss">
.cat-icon {
  flex-shrink: 0;
}
</style>
