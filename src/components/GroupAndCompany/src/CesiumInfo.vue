<template>
  <div id="cesiumInfo">
    <Transition name="fade">
      <div v-show="showInfo">
        <span>{{ longitude }}</span> ° <span>{{ latitude }}</span> °
        高度: <span>{{ height }}</span> 米
        航向: <span>{{ heading }}</span> °
        俯仰: <span>{{ pitch }}</span> °
        滚转: <span>{{ roll }}</span>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, toRaw, unref, type ComputedRef } from 'vue';
import { Math as CesiumMath, ScreenSpaceEventHandler, ScreenSpaceEventType } from 'cesium';
import type { Viewer } from 'cesium';
import { useCesium } from '@/hooks/cesium/useCesium';
import { getViewer } from '@/utils/cesium';

// useCesium 为 JS 模块,这里显式声明 viewer 的类型
const { viewerRef } = useCesium() as { viewerRef: ComputedRef<Viewer | null> };

// 响应式相机信息数据
const longitude = ref('0.0000000');
const latitude = ref('0.0000000');
const height = ref('0');
const heading = ref('0.00');
const pitch = ref('0.00');
const roll = ref('0.00');
const showInfo = ref(false);

watch(
  viewerRef,
  (viewer) => {
    if (!viewer) return;

    getCesiumInfo();
    const { camera, scene } = toRaw(unref(viewer));

    camera.moveStart.addEventListener(() => {
      showInfo.value = false;
    });

    camera.moveEnd.addEventListener(() => {
      getCesiumInfo();
      showInfo.value = true;
    });

    const handler = new ScreenSpaceEventHandler(scene.canvas);
    handler.setInputAction(() => {
      showInfo.value = true;
    }, ScreenSpaceEventType.LEFT_UP);
  },
  { immediate: true }
);

function getCesiumInfo() {
  const viewer = getViewer();
  if (!viewer) return;

  const { camera } = viewer;
  const cartographic = camera.positionCartographic;

  longitude.value = CesiumMath.toDegrees(cartographic.longitude).toFixed(7);
  latitude.value = CesiumMath.toDegrees(cartographic.latitude).toFixed(7);
  height.value = Math.ceil(cartographic.height).toString();
  pitch.value = CesiumMath.toDegrees(camera.pitch).toFixed(2);
  heading.value = CesiumMath.toDegrees(camera.heading).toFixed(2);
  roll.value = CesiumMath.toDegrees(camera.roll).toFixed(2);
}
</script>

<style scoped>
#cesiumInfo {
  position: absolute;
  padding: 2px;
  bottom: 2px;
  left: 2px;
  z-index: 999;
  color: #d9d9d9;
  font-size: 14px;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
