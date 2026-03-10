<script setup>
import { ref, unref, watch, onUnmounted, onMounted, toRaw, nextTick } from 'vue';
import { InputNumber } from 'ant-design-vue';
// import Slider from '@/components/Slider/index.vue'
import { translateModel, getViewer } from '@/utils/cesium';
import { Color as CesiumColor, CallbackProperty, Model, Math } from 'cesium';

const props = defineProps({
  model: {
    type: Object,
    required: true,
    validator: (value) => {
      return value && value.boundingSphere && value.boundingSphere.center;
    }
  }
});

// 原点参考点
// const originPoint = ref(null);

// 位置参数
const translation = ref({
  x: 0,
  y: 0,
  z: 0
});

// 旋转参数
const rotation = ref({
  x: 0,
  y: 0,
  z: 0
});

// 缩放参数
const scale = ref(1);

// 更新原点位置的回调属性
const positionCallback = new CallbackProperty(() => {
  if (props.model && props.model.boundingSphere) {
    return props.model.boundingSphere.center;
  }
  return null;
}, false);

// 更新原点位置
// function updatePosition() {
//   if (originPoint.value && props.model && props.model.boundingSphere) {
//     originPoint.value.position = positionCallback;
//   }
// }

// 重置参数函数
const resetTranslation = () => {
  translation.value = { x: 0, y: 0, z: 0 };
};

const resetRotation = () => {
  rotation.value = { x: 0, y: 0, z: 0 };
};

const resetScale = () => {
  scale.value = 1;
};

// 监听平移参数变化
watch(translation, (newVal) => {
  translateModel(props.model, newVal, unref(rotation), unref(scale));

}, { deep: true });

// 监听旋转参数变化
watch(rotation, (newVal) => {
  console.log('rotation: ', newVal);
  translateModel(props.model, unref(translation), newVal, unref(scale));

}, { deep: true });

// 监听缩放参数变化
watch(scale, (newVal) => {
  translateModel(props.model, unref(translation), unref(rotation), newVal);
});

// 组件挂载
onMounted(async () => {
  try {
    await nextTick();
    console.log('props.model: ', props.model);
    if (!props.model || !props.model.boundingSphere) {
      console.error('Model model or boundingSphere is not available');
      return;
    }
    if (props.model instanceof Model) {
      isModel.value = true;
      // rotation.value.z = 90;
    }
    const viewer = getViewer();

    // 添加原点参考点
    // originPoint.value = viewer.entities.add({
    //   position: props.model.boundingSphere.center,
    //   model: {
    //     uri: '/src/assets/models/axis.glb',
    //     scale: 0.1,
    //   }
    // });
  } catch (error) {
    console.error('Error initializing ModelSlider component:', error);
  }
});

// 组件卸载
onUnmounted(() => {
  try {
    const viewer = getViewer();
    // if (originPoint.value && viewer && viewer.entities) {
    //   viewer.entities.remove(originPoint.value);
    //   originPoint.value = null;
    //   console.log('ModelSlider component cleaned up');
    // }
  } catch (error) {
    console.error('Error during component cleanup:', error);
  }
});
</script>

<template>
  <div class="model-slider">
    <!-- 平移控制 -->
    <section class="control-section" v-show="!isModel">
      <h4>平移</h4>
      <div class="slider-item">
        <label>X轴</label>
        <InputNumber v-model:value="translation.x" :min="-300" :max="300" :step="0.1" />
      </div>
      <div class="slider-item">
        <label>Y轴</label>
        <InputNumber v-model:value="translation.y" :min="-300" :max="300" :step="0.1" />
      </div>
      <div class="slider-item">
        <label>Z轴</label>
        <InputNumber v-model:value="translation.z" :min="-300" :max="300" :step="0.1" />
      </div>
    </section>

    <!-- 旋转控制 -->
    <section class="control-section">
      <h4>旋转</h4>
      <div class="slider-item" v-show="!isModel">
        <label>X轴</label>
        <InputNumber :max="180" :step="0.1" />
      </div>
      <div class="slider-item" v-show="!isModel">
        <label>Y轴</label>
        <InputNumber v-model:value="rotation.y" :min="-180" :max="180" :step="0.1" />
      </div>
      <div class="slider-item">
        <label>Z轴</label>
        <InputNumber v-model:value="rotation.z" :min="-180" :max="180" :step="0.01" />
      </div>
    </section>

    <!-- 缩放控制 -->
    <section class="control-section" v-show="!isModel">
      <h4>缩放</h4>
      <div class="slider-item" @dblclick.stop="resetScale">
        <label>比例</label>
        <InputNumber v-model:value="scale" :min="0.1" :max="2" :step="0.1" />
      </div>
    </section>
  </div>
</template>

<style scoped>
.model-slider {
  padding: 16px;
  max-width: 300px;
}

.control-section {
  margin-bottom: 16px;
}

.control-section h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.slider-item {
  margin-bottom: 12px;
}

.slider-item label {
  display: block;
  margin-bottom: 4px;
  font-size: 12px;
  color: #666;
}

.slider-item:global(.ant-slider) {
  margin: 0;
}
</style>
