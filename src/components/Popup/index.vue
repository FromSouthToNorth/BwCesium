<!-- CesiumPopup.vue -->
<template>
  <div v-if="visible" ref="popupRef" class="cesium-custom-popup" :style="popupStyle">
    <div class="popup-header">
      <h3 class="popup-title">{{ title }}</h3>
      <span class="popup-close" @click="handleClose">×</span>
    </div>
    <div class="popup-content">
      <!-- 支持传入 HTML 或插槽 -->
      <slot name="default">
        <span v-html="content" />
      </slot>
    </div>
    <!-- 小尖角（可选） -->
    <div class="arrow"></div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, unref, toRaw } from 'vue'
import { SceneTransforms, Cartesian3, Matrix4, BoundingSphere, Intersect, defined } from 'cesium'
import { getViewer } from '@/utils/cesium';

defineOptions({
  name: 'CesiumPopup'
})

const props = defineProps({
  position: {
    type: [Object, Array], // Cesium.Cartesian3
    required: true
  },
  title: {
    type: String,
    default: '信息'
  },
  content: {
    type: String,
    default: ''
  },
  offset: {
    type: Array,
    default: () => [0, 30] // [x, y] 像素偏移
  }
})

const emit = defineEmits(['close'])

const visible = ref(false)
const popupRef = ref(null)
const removePostRender = ref(null)

// 计算弹窗位置样式
const popupStyle = computed(() => {
  if (!visible.value || !screenPosition.value) {
    return { display: 'none' }
  }

  const [offsetX, offsetY] = props.offset

  const { x, y } = screenPosition.value

  return {
    left: `${x + offsetX}px`,
    top: `${y + offsetY}px`,
    transform: `translate(calc(-50% + ${offsetX}px), calc(-100% + ${offsetY}px))`,
    display: 'block'
  }
})

// 屏幕坐标
const screenPosition = ref(null)

const updatePosition = () => {
  if (!props.position || !getViewer()?.scene) {
    visible.value = false
    return
  }

  try {
    const pos = SceneTransforms.worldToWindowCoordinates(
      getViewer().scene,
      props.position
    )

    if (!pos) {
      visible.value = false
      return
    }

    screenPosition.value = pos
    visible.value = true
  } catch (e) {
    console.warn('CesiumPopup: 坐标转换失败', e)
    visible.value = false
  }
}

const handleClose = () => {
  visible.value = false
  emit('close')
}

// 监听 Esc 关闭
const handleEsc = (e) => {
  if (e.key === 'Escape' && visible.value) {
    handleClose()
  }
}

const lastCamera = new Matrix4();

// 注册/注销 postRender
const bindPostRender = () => {
  if (!getViewer()?.scene?.postUpdate) return
  removePostRender.value = getViewer().scene.postRender.addEventListener(function (scene, currentTime) {
    if (Matrix4.equalsEpsilon(scene.camera.viewMatrix, lastCamera, 0.0001)) return
    updatePosition()
  })
}

const unbindPostRender = () => {
  if (removePostRender.value) {
    removePostRender.value()
    removePostRender.value = null
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleEsc)
  bindPostRender()
  // 初次显示
  updatePosition()
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleEsc)
  unbindPostRender()
})

// 监听 position 变化
watch(
  () => props.position,
  () => {
    updatePosition()
  },
  { deep: true }
)

// 暴露方法给外部调用
defineExpose({
  show: () => {
    visible.value = true
    updatePosition()
  },
  hide: () => {
    visible.value = false
  },
  updatePosition
})
</script>

<style scoped>
.cesium-custom-popup {
  position: absolute;
  background: rgba(0, 0, 0, 0.85);
  color: white;
  padding: 12px 16px;
  border-radius: 6px;
  min-width: 220px;
  max-width: 360px;
  font-size: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.6);
  pointer-events: auto;
  z-index: 1000;
  user-select: text;
}

.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  border-bottom: 1px solid #555;
  padding-bottom: 6px;
}

.popup-title {
  margin: 0;
  font-size: 16px;
}

.popup-close {
  cursor: pointer;
  font-size: 20px;
  font-weight: bold;
}

.popup-close:hover {
  color: #ff6b6b;
}

.popup-content {
  line-height: 1.5;
}

.arrow {
  position: absolute;
  bottom: -10px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 10px solid transparent;
  border-right: 10px solid transparent;
  border-top: 10px solid rgba(0, 0, 0, 0.6);
}
</style>
