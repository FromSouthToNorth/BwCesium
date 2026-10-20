<template>
  <div>
    <Modal
      ref="modalRef"
      style="top: 50px"
      :style="{ width: width }"
      :mask="mask"
      v-model:open="internalOpen"
      :wrap-style="{ overflow: 'hidden' }"
      :afterClose="handleClose"
      @cancel="handleCancel"
      @ok="handleOk"
    >
      <slot />
      <template #title>
        <div ref="modalTitleRef" style="width: 100%; cursor: move">{{ title }}</div>
      </template>
      <template #footer>
        <slot name="footer" />
      </template>
      <template #modalRender="{ originVNode }">
        <div :style="transformStyle">
          <component :is="originVNode" />
        </div>
      </template>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, watchEffect } from 'vue'
import { Modal } from 'ant-design-vue'
import { useDraggable } from '@vueuse/core'

const props = defineProps({
  open: {
    type: Boolean,
    default: false,
  },
  mask: {
    type: Boolean,
    default: true,
  },
  title: {
    type: String,
    default: '',
  },
  width: {
    type: String,
    default: '260px',
  },
  initialX: {
    type: Number,
    default: 760,
  },
  initialY: {
    type: Number,
    default: 30,
  },
})

const emit = defineEmits(['update:open', 'afterClose', 'cancel', 'ok'])

const internalOpen = ref(props.open)
const modalTitleRef = ref<any>(null)

// 监听 open 属性变化
watch(
  () => props.open,
  (val) => {
    internalOpen.value = val
  },
)

// 处理关闭事件
const handleClose = () => {
  internalOpen.value = false
  emit('update:open', false)
  emit('afterClose', false)
}

// 处理取消事件
const handleCancel = () => {
  internalOpen.value = false
  emit('update:open', false)
  emit('cancel')
}

// 处理确定按钮点击
const handleOk = () => {
  internalOpen.value = false
  emit('update:open', false)
  emit('ok')
}

// 使用拖拽功能
const { x: dragX, y: dragY, isDragging } = useDraggable(modalTitleRef)

// 拖拽相关状态
const startX = ref(0)
const startY = ref(0)
const isDraggingStarted = ref(false)
const transformX = ref(props.initialX)
const transformY = ref(props.initialY)
const previousTransformX = ref(0)
const previousTransformY = ref(0)
const dragBoundary = ref({
  left: 0,
  right: 0,
  top: 0,
  bottom: 0,
})

// 监听拖拽开始
watch([dragX, dragY], () => {
  if (!isDraggingStarted.value) {
    startX.value = dragX.value
    startY.value = dragY.value

    // 计算拖拽边界
    const bodyRect = document.body.getBoundingClientRect()
    const titleRect = modalTitleRef.value.getBoundingClientRect()

    dragBoundary.value.right = bodyRect.width - titleRect.width
    dragBoundary.value.bottom = bodyRect.height - titleRect.height

    previousTransformX.value = transformX.value
    previousTransformY.value = transformY.value
  }
  isDraggingStarted.value = true
})

// 监听拖拽结束
watch(isDragging, () => {
  if (!isDragging.value) {
    isDraggingStarted.value = false
  }
})

// 计算拖拽位置
watchEffect(() => {
  if (isDraggingStarted.value) {
    // 计算限制在边界内的坐标
    const clampedX = Math.min(
      Math.max(dragBoundary.value.left, dragX.value),
      dragBoundary.value.right,
    )
    const clampedY = Math.min(
      Math.max(dragBoundary.value.top, dragY.value),
      dragBoundary.value.bottom,
    )

    // 更新变换位置
    transformX.value = previousTransformX.value + clampedX - startX.value
    transformY.value = previousTransformY.value + clampedY - startY.value
  }
})

// 计算变换样式
const transformStyle = computed(() => ({
  transform: `translate(${transformX.value}px, ${transformY.value}px)`,
}))
</script>
