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
 * 安全地获取实体属性值
 * @param {Cesium.Entity} entity - Cesium 实体
 * @param {Cesium.Viewer} viewer - Cesium viewer 实例
 * @returns {Object|null} 属性值或 null
 */
export function getEntityProperties(entity, viewer) {
  if (!entity || !entity.properties) {
    return null;
  }

  try {
    if (typeof entity.properties.getValue === 'function') {
      return entity.properties.getValue(viewer?.clock?.currentTime);
    }
    return entity.properties;
  } catch (error: any) {
    console.error('Error getting entity properties:', error);
    return null;
  }
}

/**
 * 验证并获取有效的 Cesium 颜色
 * @param {string|Object} color - 颜色名称或 Cesium 颜色对象
 * @param {string} defaultColor - 默认颜色名称
 * @param {Object} CesiumColor - Cesium 颜色模块（需要从调用方传入）
 * @returns {Object} 有效的 Cesium 颜色对象
 */
export function getValidColor(color, defaultColor = 'WHITE', CesiumColor = null) {
  // 如果没有传入 CesiumColor，尝试从全局获取
  if (!CesiumColor && (window as any).Cesium) {
    CesiumColor = (window as any).Cesium.Color;
  }

  if (!CesiumColor) {
    console.warn('Cesium Color module not available');
    return null;
  }

  // 如果已经是 Cesium 颜色对象，直接返回
  if (color && typeof color === 'object' && color.clone) {
    return color;
  }

  if (color && CesiumColor[color]) {
    return CesiumColor[color];
  }

  console.warn(`Invalid color: ${color}, using default color: ${defaultColor}`);
  return CesiumColor[defaultColor];
}

/**
 * 创建带有错误处理的异步函数包装器
 * @param {Function} asyncFn - 异步函数
 * @param {string} errorMessage - 错误消息前缀
 * @returns {Function} 包装后的函数
 */
export function withErrorHandling(asyncFn, errorMessage = 'Error') {
  return async (...args) => {
    try {
      return await asyncFn(...args);
    } catch (error: any) {
      console.error(`${errorMessage}:`, error);
      throw error;
    }
  };
}

/**
 * 防抖函数
 * @param {Function} func - 需要防抖的函数
 * @param {number} wait - 等待时间（毫秒）
 * @returns {Function} 防抖后的函数
 */
export function debounce(func, wait = 300) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * 节流函数
 * @param {Function} func - 需要节流的函数
 * @param {number} limit - 限制时间（毫秒）
 * @returns {Function} 节流后的函数
 */
export function throttle(func, limit = 300) {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
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

/**
 * 格式化坐标显示
 * @param {number} longitude - 经度
 * @param {number} latitude - 纬度
 * @param {number} decimals - 小数位数
 * @returns {string} 格式化后的坐标字符串
 */
export function formatCoordinate(longitude, latitude, decimals = 6) {
  if (!isValidCoordinate(longitude, latitude)) {
    return 'Invalid coordinate';
  }
  const lon = longitude.toFixed(decimals);
  const lat = latitude.toFixed(decimals);
  return `${lon}°, ${lat}°`;
}
