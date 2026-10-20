import { ref, computed, watch, onUnmounted } from 'vue'
import { message } from 'ant-design-vue'
import {
  getClippingElevationInfo,
  adjustClippingAreaElevation,
  restoreClippingAreaElevation,
  canAdjustElevation,
  canRestoreElevation
} from '@/utils/cesium/elevation'

/**
 * 裁切区域高度调整的组合式API
 * 提供对话框的状态管理和业务逻辑
 */
export function useClippingElevation() {
  // 响应式状态
  const dialogVisible = ref(false)
  const heightOffset = ref(50)
  const previewEnabled = ref(false)
  const loading = ref(false)
  const elevationInfo = ref<any>(null)

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
      cancelPreview()
    } else {
      applyPreview()
    }
  }

  async function applyPreview() {
    if (!canApply.value || loading.value) return

    try {
      loading.value = true
      // 预览逻辑占位符
      message.info(`预览：${heightOffset.value > 0 ? '抬升' : '下降'} ${Math.abs(heightOffset.value)}米`)
    } catch (error: any) {
      console.error('预览失败:', error)
      message.error('预览失败: ' + error.message)
    } finally {
      loading.value = false
    }
  }

  function cancelPreview() {
    message.info('已取消预览')
  }

  async function applyElevationAdjustment() {
    if (!canApply.value || loading.value) return null

    try {
      loading.value = true
      const results: any = await adjustClippingAreaElevation(heightOffset.value)

      if (results.success > 0) {
        message.success(`成功调整 ${results.success} 个实体的高度`)
      } else {
        message.warning('没有实体被调整')
      }

      if (results.failed > 0) {
        message.warning(`${results.failed} 个实体调整失败`)
      }

      updateElevationInfo()
      return results
    } catch (error: any) {
      console.error('高度调整失败:', error)
      message.error('高度调整失败: ' + error.message)
      throw error
    } finally {
      loading.value = false
    }
  }

  async function restoreElevation() {
    if (!canRestore.value || loading.value) return null

    try {
      loading.value = true
      const results: any = await restoreClippingAreaElevation()

      if (results.restored > 0) {
        message.success(`成功恢复 ${results.restored} 个实体的高度`)
      } else {
        message.warning('没有实体需要恢复')
      }

      if (results.failed > 0) {
        message.warning(`${results.failed} 个实体恢复失败`)
      }

      updateElevationInfo()
      return results
    } catch (error: any) {
      console.error('高度恢复失败:', error)
      message.error('高度恢复失败: ' + error.message)
      throw error
    } finally {
      loading.value = false
    }
  }

  function openDialog() {
    dialogVisible.value = true
    updateElevationInfo()
    startInfoUpdate()
  }

  function closeDialog() {
    if (previewEnabled.value) {
      cancelPreview()
    }
    dialogVisible.value = false
    stopInfoUpdate()
  }

  function updateElevationInfo() {
    try {
      elevationInfo.value = getClippingElevationInfo()
    } catch (error: any) {
      console.error('更新裁切区域信息失败:', error)
      elevationInfo.value = null
    }
  }

  // 监听裁切区域变化
  let updateInterval: any = null
  function startInfoUpdate() {
    updateInterval = setInterval(() => {
      updateElevationInfo()
    }, 2000)
  }

  function stopInfoUpdate() {
    if (updateInterval) {
      clearInterval(updateInterval)
      updateInterval = null
    }
  }

  // 自动清理
  onUnmounted(() => {
    stopInfoUpdate()
    if (previewEnabled.value) {
      cancelPreview()
    }
  })

  // 监听对话框可见性变化
  watch(dialogVisible, (newVal) => {
    if (newVal) {
      startInfoUpdate()
    } else {
      stopInfoUpdate()
    }
  })

  return {
    // 状态
    dialogVisible,
    heightOffset,
    previewEnabled,
    loading,
    elevationInfo,

    // 计算属性
    clippingInfo,
    entityStats,
    canApply,
    canRestore,

    // 方法
    getTypeLabel,
    setOffset,
    handleOffsetChange,
    handlePreviewChange,
    applyPreview,
    cancelPreview,
    applyElevationAdjustment,
    restoreElevation,
    openDialog,
    closeDialog,
    updateElevationInfo
  }
}

/**
 * 检查是否可以使用高度调整功能
 * @returns {Object} 检查结果
 */
export function useElevationAvailability() {
  const checkAvailability = () => {
    const adjustCheck = canAdjustElevation()
    const restoreCheck = canRestoreElevation()

    return {
      canAdjust: adjustCheck.canAdjust,
      canRestore: restoreCheck.canRestore,
      adjustReason: adjustCheck.reason,
      restoreReason: restoreCheck.reason,
      info: adjustCheck.info
    }
  }

  return {
    checkAvailability
  }
}
