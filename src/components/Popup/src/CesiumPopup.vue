<!-- CesiumPopup.vue -->
<template>
  <div v-if="visible && screenPos" ref="popupRef" class="cesium-popup" :style="{
    left: `${screenPos.x}px`,
    top: `${screenPos.y}px`,
    transform: `translate(-50%, -100%) translate3d(0,0,0)`,
    display: screenPos.visible ? 'block' : 'none'
  }">
    <component :is="contentComponent" v-bind="contentProps" @close="emit('close')" />
  </div>
</template>

<script setup lang="ts">
import { ref, shallowRef, onMounted, onUnmounted, nextTick } from 'vue'
import * as Cesium from 'cesium'

const props = defineProps({
  viewer: { type: Object, required: true },
  position: { type: [Cesium.Cartesian3, Object], required: true }, // Cartesian3 或 {x,y,z}
  contentComponent: { type: [Object, Function], required: true },
  contentProps: { type: Object, default: () => ({}) },
  pixelOffset: { type: Array, default: () => [0, -10] } // [x, y] 像素偏移
})

const emit = defineEmits(['close'])

const visible = ref(false)
const popupRef = ref<any>(null)
const screenPos = ref({ x: 0, y: 0, visible: false })

let removePreUpdate: any = null
let removeChanged: any = null

const computeScreenPosition = () => {
  if (!props.viewer?.scene || !props.position) return

  const scene = props.viewer.scene
  const position: any = (Cesium.Cartesian3 as any).isCartesian3(props.position)
    ? props.position
    : new Cesium.Cartesian3((props.position as any).x, (props.position as any).y, (props.position as any).z)

  // 关键：使用 worldToWindowCoordinates X/Y/Z 完整投影）
  const windowPos: any = Cesium.SceneTransforms.worldToWindowCoordinates(scene, position)

  if (!Cesium.defined(windowPos)) {
    screenPos.value = { x: 0, y: 0, visible: false }
    return
  }

  // 额外检查：是否在视锥内（防背面漂移）
  const inFrustum = scene.camera.frustum.computeCullingVolume().computeVisibility(
    new Cesium.BoundingSphere(position, 1.0) // 小球体检测
  ) !== Cesium.Intersect.OUTSIDE

  if (!inFrustum) {
    screenPos.value = { x: 0, y: 0, visible: false }
    return
  }

  // X/Y 像素四舍五入 → 防亚像素抖动
  const x = Math.round(windowPos.x + props.pixelOffset[0])
  const y = Math.round(windowPos.y + props.pixelOffset[1])

  screenPos.value = { x, y, visible: true }
}

const show = () => {
  visible.value = true
  nextTick(() => computeScreenPosition())
}

const hide = () => {
  visible.value = false
  screenPos.value.visible = false
}

defineExpose({ show, hide })

onMounted(() => {
  if (!props.viewer) return

  // 方案1：每帧更新（最高精度，推荐现代设备）
  removePreUpdate = props.viewer.scene.preUpdate.addEventListener(computeScreenPosition)

  // 方案2：低阈值 changed 事件（备用，省电）
  // props.viewer.camera.percentageChanged = 0.002
  // removeChanged = props.viewer.camera.changed.addEventListener(computeScreenPosition)
})

onUnmounted(() => {
  if (removePreUpdate) removePreUpdate()
  if (removeChanged) removeChanged()
})
</script>

<style scoped>
.cesium-popup {
  position: absolute;
  pointer-events: auto;
  z-index: 10000;
  will-change: transform, left, top;
  backface-visibility: hidden;
  transform-style: preserve-3d;
  /* 防浏览器渲染抖动 */
  transition: none;
  /* 禁止 transition 导致的延迟 */
}

/* 可选：远距离时轻微缩放气泡（考虑 Z 轴远近感） */
.cesium-popup.small {
  transform: translate(-50%, -100%) scale(0.8) translate3d(0, 0, 0);
}
</style>
