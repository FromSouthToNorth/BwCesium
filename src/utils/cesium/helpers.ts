import { toRaw, unref } from 'vue';
import { useCesium } from '@/hooks/cesium/useCesium';

/**
 * Cesium 辅助函数集合
 * 提供通用的 Cesium 相关工具函数
 */

/**
 * 获取 Cesium viewer 实例
 * @returns {Cesium.Viewer} Cesium viewer 实例
 */
export function getViewer() {
  const { viewerRef } = useCesium();
  return toRaw(unref(viewerRef));
}

/**
 * 安全执行 Cesium 操作，自动处理 viewer 获取
 * @param {Function} operation - 需要执行的操作，接收 viewer 作为参数
 * @param {string} errorMessage - 错误消息
 * @returns {*} 操作结果
 */
export function safeCesiumOperation(operation, errorMessage = 'Cesium operation failed') {
  try {
    const viewer = getViewer();
    if (!viewer) {
      throw new Error('Cesium viewer not available');
    }
    return operation(viewer);
  } catch (error: any) {
    console.error(`${errorMessage}:`, error);
    throw error;
  }
}

/**
 * 批量添加实体到 viewer
 * @param {Cesium.Entity[]} entities - 实体数组
 * @param {Cesium.Viewer} viewer - Cesium viewer 实例
 * @returns {Cesium.Entity[]} 添加的实体数组
 */
export function addEntities(entities, viewer = null) {
  const targetViewer = viewer || getViewer();
  if (!targetViewer) {
    console.warn('Cannot add entities: viewer not available');
    return [];
  }

  const addedEntities: any[] = [];
  entities.forEach(entity => {
    if (entity) {
      const addedEntity = targetViewer.entities.add(entity);
      addedEntities.push(addedEntity);
    }
  });
  return addedEntities;
}

/**
 * 批量移除实体
 * @param {Cesium.Entity[]} entities - 实体数组
 * @param {Cesium.Viewer} viewer - Cesium viewer 实例
 */
export function removeEntities(entities, viewer?: any) {
  const targetViewer = getViewer();
  if (!targetViewer) {
    console.warn('Cannot remove entities: viewer not available');
    return;
  }

  entities.forEach(entity => {
    if (entity) {
      targetViewer.entities.remove(entity);
    }
  });
}

/**
 * 清理实体数组并重置
 * @param {Cesium.Entity[]} entityArray - 实体数组引用
 * @param {Cesium.Viewer} viewer - Cesium viewer 实例
 */
export function clearEntityArray(entityArray, viewer = null) {
  if (!entityArray || !Array.isArray(entityArray)) {
    return;
  }

  removeEntities(entityArray, viewer);
  entityArray.length = 0;
}

/**
 * 检查坐标是否在有效范围内
 * @param {number} longitude - 经度
 * @param {number} latitude - 纬度
 * @returns {boolean} 是否有效
 */
export function isValidCoordinate(longitude, latitude) {
  return (
    longitude >= -180 && longitude <= 180 &&
    latitude >= -90 && latitude <= 90
  );
}
