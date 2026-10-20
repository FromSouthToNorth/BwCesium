<template>
  <div class="slider-box">
    <div class="slider-row">
      <!-- 滑块 -->
      <input type="range" class="range-input" v-model.number="localValue" :min="min" :max="max" :step="step" />
      <!-- 数值输入框 -->
      <input type="number" class="number-input" v-model.number="localValue" :min="min" :max="max" :step="step"
        @blur="handleBlur" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'

const props = defineProps({
  modelValue: [Number, String],
  min: {
    type: Number,
    default: 0
  },
  max: {
    type: Number,
    default: 100
  },
  step: {
    type: Number,
    default: 1
  },
  unit: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue'])

// 内部值（统一用 number 类型）
const localValue = ref(Number(props.modelValue) || props.min)

// 同步父组件 v-model
watch(localValue, (newVal) => {
  // 限制范围
  let val = Math.max(props.min, Math.min(props.max, Number(newVal) || 0))

  // 按 step 对齐（可选，根据需求可注释掉）
  if (props.step > 0) {
    val = Math.round(val / props.step) * props.step
  }
  console.log('val: ', val);

  if (val !== localValue.value) {
    localValue.value = val
  }

  emit('update:modelValue', val)
})

// 父组件值变化时同步
watch(() => props.modelValue, (newVal) => {
  const num = Number(newVal)
  if (!isNaN(num)) {
    localValue.value = num
  }
})

// 输入框失焦时做一次最终校验
const handleBlur = () => {
  let val = Number(localValue.value)
  if (isNaN(val)) val = props.min

  val = Math.max(props.min, Math.min(props.max, val))

  if (props.step > 0) {
    val = Math.round(val / props.step) * props.step
  }

  localValue.value = val
}
</script>

<style scoped>
.slider-box {
  width: 100%;
  max-width: 420px;
  padding: 6px;
}

.slider-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.range-input {
  flex: 1;
  height: 3px;
  -webkit-appearance: none;
  background: #e0e0e0;
  border-radius: 3px;
  outline: none;
  margin: 0;
}

.range-input::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #409eff;
  border: 1px solid white;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
  cursor: pointer;
}

.range-input::-webkit-slider-thumb:hover {
  transform: scale(1.15);
}

.number-input {
  width: 80px;
  padding: 6px 8px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  font-size: 14px;
  text-align: center;
}

.number-input:focus {
  outline: none;
  border-color: #409eff;
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
}

.value-display {
  margin-top: 8px;
  font-size: 13px;
  color: #666;
  text-align: center;
}
</style>
