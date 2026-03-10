<template>
  <BaseDraggableModal v-model:open="visible" title="裁切区域高度调整" width="400px" :mask="false" :destroy-on-close="true"
    :initial-x="initialX" :initial-y="initialY" @cancel="handleCancel" @ok="handleOk">
    <!-- 裁切区域信息 -->
    <div v-if="clippingInfo" class="clipping-info">
      <div class="info-item">
        <span class="label">裁切区域：</span>
        <span class="value">{{ clippingInfo.vertexCount }}个顶点</span>
      </div>
      <div class="info-item">
        <span class="label">区域面积：</span>
        <span class="value">{{ clippingInfo.area }} km²</span>
      </div>
    </div>
    <div v-else class="no-clipping">
      <Alert message="没有激活的裁切区域" type="warning" show-icon />
      <p class="hint">请先使用裁切功能选择一个区域</p>
    </div>

    <!-- 实体统计信息 -->
    <div v-if="entityStats.total > 0" class="entity-stats">
      <div class="stats-header">
        <span class="label">范围内实体：</span>
        <span class="total">{{ entityStats.total }}个</span>
      </div>
      <div class="stats-details">
        <Tag v-for="(count, type) in entityStats.byType" :key="type" color="blue">
          {{ getTypeLabel(type) }}: {{ count }}
        </Tag>
      </div>
      <div v-if="entityStats.dataSources.length > 0" class="data-sources">
        <span class="label">数据源：</span>
        <span class="sources">{{ entityStats.dataSources.join(', ') }}</span>
      </div>
    </div>
    <div v-else-if="clippingInfo" class="no-entities">
      <Alert message="裁切区域内没有实体" type="info" show-icon />
    </div>

    <!-- 高度调整控制 -->
    <div v-if="entityStats.total > 0" class="elevation-control">
      <div class="control-header">
        <span class="label">高度调整：</span>
        <span class="hint">（正数为抬升，负数为下降）</span>
      </div>

      <div class="offset-control">
        <InputNumber v-model:value="heightOffset" :min="-5000" :max="5000" :step="100" addon-after="米"
          style="width: 100%" @change="handleOffsetChange" />
        <div class="offset-hints">
          <span class="hint negative" @click="setOffset(-heightOffset)">下降 {{ heightOffset }}米</span>
          <span class="hint positive" @click="setOffset(heightOffset)">抬升{{ heightOffset }}米</span>
        </div>
      </div>

      <div class="preview-control">
        <Checkbox v-model:checked="previewEnabled" @change="handlePreviewChange">
          实时预览
        </Checkbox>
        <span class="hint">（预览时不会保存修改）</span>
      </div>
    </div>

    <!-- 操作按钮 -->
    <template #footer>
      <div class="dialog-footer">
        <Button @click="handleCancel">取消</Button>
        <Button v-if="canRestore" :disabled="loading" @click="handleRestore">
          恢复高度
        </Button>
        <Button type="primary" :disabled="!canApply || loading" :loading="loading" @click="handleApply">
          应用调整
        </Button>
      </div>
    </template>

    <!-- 加载状态 -->
    <Spin v-if="loading" :spinning="loading" fullscreen />
  </BaseDraggableModal>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { InputNumber, Checkbox, Button, Tag, Alert, Spin, message } from 'ant-design-vue'
import BaseDraggableModal from '../../BaseDraggableModal.vue';
import {
  getClippingElevationInfo,
  adjustClippingAreaElevation,
  restoreClippingAreaElevation,
  canAdjustElevation,
  canRestoreElevation
} from '@/utils/cesium/elevation'

const props = defineProps({
  open: {
    type: Boolean,
    default: false
  },
  initialX: {
    type: Number,
    default: 760
  },
  initialY: {
    type: Number,
    default: 360
  }
})

const emit = defineEmits(['update:open', 'applied', 'restored', 'cancel'])

// 响应式状态
const visible = ref(props.open)
const heightOffset = ref(100) // 默认抬升50米
const previewEnabled = ref(false)
const loading = ref(false)
const elevationInfo = ref(null)

// 计算属性
const clippingInfo = computed(() => {
  return elevationInfo.value?.hasClipping ? elevationInfo.value.clippingInfo : null
})

const entityStats = computed(() => {
  return elevationInfo.value?.hasClipping ? elevationInfo.value.entityStats : { total: 0, byType: {}, bySource: {}, dataSources: [] }
})

const canApply = computed(() => {
  return elevationInfo.value?.hasClipping && elevationInfo.value.canAdjust && heightOffset.value !== 0
})

const canRestore = computed(() => {
  return elevationInfo.value?.hasClipping && elevationInfo.value.canRestore
})

// 实体类型标签映射
const typeLabels = {
  point: '点',
  line: '线',
  polygon: '面',
  model: '模型',
  label: '标签',
  cylinder: '圆柱',
  box: '盒子',
  ellipsoid: '椭球',
  other: '其他'
}

// 方法
function getTypeLabel(type) {
  return typeLabels[type] || type
}

function setOffset(offset) {
  heightOffset.value = offset
  if (previewEnabled.value) {
    applyPreview()
  }
}

function handleOffsetChange() {
  if (previewEnabled.value) {
    applyPreview()
  }
}

function handlePreviewChange(checked) {
  if (!checked) {
    // 关闭预览时恢复原始状态
    cancelPreview()
  } else {
    // 开启预览时应用预览
    applyPreview()
  }
}

async function applyPreview() {
  if (!canApply.value || loading.value) return

  try {
    loading.value = true
    // 这里应该实现预览逻辑，但为了简化，我们先不实现完整的预览
    // 实际实现时应该临时调整实体高度，但不保存原始高度
    message.info(`预览：${heightOffset.value > 0 ? '抬升' : '下降'} ${Math.abs(heightOffset.value)}米`)
  } catch (error) {
    console.error('预览失败:', error)
    message.error('预览失败: ' + error.message)
  } finally {
    loading.value = false
  }
}

function cancelPreview() {
  // 取消预览，恢复原始状态
  // 实际实现时应该恢复实体的原始高度
  message.info('已取消预览')
}

async function handleApply() {
  if (!canApply.value || loading.value) return

  try {
    loading.value = true
    const results = await adjustClippingAreaElevation(heightOffset.value)

    if (results.success > 0) {
      message.success(`成功调整 ${results.success} 个实体的高度`)
      emit('applied', results)
      // 更新信息
      updateElevationInfo()
    } else {
      message.warning('没有实体被调整')
    }

    if (results.failed > 0) {
      message.warning(`${results.failed} 个实体调整失败`)
    }
  } catch (error) {
    console.error('高度调整失败:', error)
    message.error('高度调整失败: ' + error.message)
  } finally {
    loading.value = false
  }
}

async function handleRestore() {
  if (!canRestore.value || loading.value) return

  try {
    loading.value = true
    const results = await restoreClippingAreaElevation()

    if (results.restored > 0) {
      message.success(`成功恢复 ${results.restored} 个实体的高度`)
      emit('restored', results)
      // 更新信息
      updateElevationInfo()
    } else {
      message.warning('没有实体需要恢复')
    }

    if (results.failed > 0) {
      message.warning(`${results.failed} 个实体恢复失败`)
    }
  } catch (error) {
    console.error('高度恢复失败:', error)
    message.error('高度恢复失败: ' + error.message)
  } finally {
    loading.value = false
  }
}

function handleOk() {
  // 如果正在预览，先取消预览
  if (previewEnabled.value) {
    cancelPreview()
    previewEnabled.value = false
  }
  handleApply()
}

function handleCancel() {
  // 如果正在预览，先取消预览
  if (previewEnabled.value) {
    cancelPreview()
  }
  visible.value = false
  emit('cancel')
  emit('update:open', false)
}

function updateElevationInfo() {
  try {
    elevationInfo.value = getClippingElevationInfo()
  } catch (error) {
    console.error('更新裁切区域信息失败:', error)
    elevationInfo.value = null
  }
}

// 监听裁切区域变化（简单轮询实现）
let updateInterval = null

function startInfoUpdate() {
  updateInterval = setInterval(() => {
    updateElevationInfo()
  }, 2000) // 每2秒更新一次
}

function stopInfoUpdate() {
  if (updateInterval) {
    clearInterval(updateInterval)
    updateInterval = null
  }
}

// 生命周期
onMounted(() => {
  updateElevationInfo()
  startInfoUpdate()
})

onUnmounted(() => {
  stopInfoUpdate()
  // 确保取消预览
  if (previewEnabled.value) {
    cancelPreview()
  }
})

// 监听props变化
watch(() => props.open, (newVal) => {
  visible.value = newVal
  if (newVal) {
    updateElevationInfo()
  }
})

// 监听visible变化
watch(visible, (newVal) => {
  emit('update:open', newVal)
  if (!newVal) {
    stopInfoUpdate()
  } else {
    startInfoUpdate()
  }
})
</script>

<style scoped>
.clipping-info {
  margin-bottom: 16px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 6px;
  border: 1px solid #e9ecef;
}

.info-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 13px;
}

.info-item:last-child {
  margin-bottom: 0;
}

.label {
  color: #666;
  font-weight: 500;
}

.value {
  color: #333;
  font-weight: 600;
}

.no-clipping {
  margin-bottom: 16px;
}

.hint {
  font-size: 12px;
  color: #888;
  margin-top: 8px;
  text-align: center;
}

.entity-stats {
  margin-bottom: 20px;
  padding: 12px;
  background: #f0f9ff;
  border-radius: 6px;
  border: 1px solid #d0ebff;
}

.stats-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
  font-size: 14px;
}

.total {
  font-weight: bold;
  color: #1890ff;
}

.stats-details {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
}

.data-sources {
  font-size: 12px;
  color: #666;
}

.sources {
  color: #333;
  font-weight: 500;
}

.no-entities {
  margin-bottom: 20px;
}

.elevation-control {
  margin-top: 20px;
}

.control-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  font-size: 14px;
}

.offset-control {
  margin-bottom: 16px;
}

.offset-hints {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
}

.offset-hints .hint {
  font-size: 12px;
  color: #666;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.2s;
}

.offset-hints .hint:hover {
  background: #f0f0f0;
}

.offset-hints .negative {
  color: #ff4d4f;
}

.offset-hints .positive {
  color: #52c41a;
}

.preview-control {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
