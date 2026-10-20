<!--
  通用对话框（components/base/BaseDialog.vue）
  知识点：
  1. v-model 双向绑定：visible 状态由父组件控制
  2. 二次封装 el-dialog：统一标题/底部按钮
  3. 关闭确认：dirty 表单关闭前弹确认（PRD v2.0 第 17 条二次确认）
  4. 确认按钮 loading：提交时 loading，避免重复提交
-->
<script setup lang="ts">
import { ElDialog, ElButton } from 'element-plus'

interface Props {
  modelValue: boolean
  title?: string
  width?: string
  confirmText?: string
  cancelText?: string
  confirmLoading?: boolean
  /** 关闭前确认（如表单未保存） */
  beforeClose?: () => Promise<boolean> | boolean
  showFooter?: boolean
  disableConfirm?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  width: '500px',
  confirmText: '确定',
  cancelText: '取消',
  confirmLoading: false,
  showFooter: true,
  disableConfirm: false
})

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void
  (e: 'confirm'): void
  (e: 'cancel'): void
}>()

async function handleClose() {
  if (props.beforeClose) {
    const ok = await props.beforeClose()
    if (!ok) return
  }
  emit('update:modelValue', false)
  emit('cancel')
}

function handleConfirm() {
  emit('confirm')
}
</script>

<template>
  <el-dialog
    :model-value="props.modelValue"
    :title="props.title"
    :width="props.width"
    @close="handleClose"
  >
    <slot />
    <template v-if="props.showFooter" #footer>
      <el-button @click="handleClose">{{ props.cancelText }}</el-button>
      <el-button
        type="primary"
        :loading="props.confirmLoading"
        :disabled="props.disableConfirm"
        @click="handleConfirm"
      >
        {{ props.confirmText }}
      </el-button>
    </template>
  </el-dialog>
</template>
