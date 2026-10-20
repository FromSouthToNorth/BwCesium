/**
 * 高程控制模块主入口
 * 提供裁切区域内实体高度调整的完整功能
 */

import {
  getActiveClippingPolygon,
  hasActiveClipping,
  getClippingAreaInfo
} from './clippingIntegration';
import {
  getEntitiesInClippingArea,
  getEntityStatistics,
  getEntitiesInfo
} from './entitySelector';
import {
  getHeightAdjustmentStats,
  batchAdjustHeight,
  batchRestoreHeight,
  clearAllOriginalHeights
} from './heightAdjuster';

/**
 * 调整当前裁切区域内所有实体的高度
 * @param {number} offset - 高度偏移量（米），正数为抬升，负数为下降
 * @returns {Promise<Object>} 调整结果
 */
export function adjustClippingAreaElevation(offset) {
  return new Promise((resolve, reject) => {
    try {
      // 获取当前裁切区域
      const polygon = getActiveClippingPolygon();
      if (!polygon) {
        reject(new Error('没有激活的裁切区域'));
        return;
      }

      // 获取裁切区域内的所有实体
      const entities = getEntitiesInClippingArea(polygon);
      if (entities.length === 0) {
        resolve({
          success: true,
          total: 0,
          message: '裁切区域内没有可调整的实体'
        });
        return;
      }

      // 批量调整高度
      const results = batchAdjustHeight(entities, offset);
      resolve(results);
    } catch (error: any) {
      reject(error);
    }
  });
}

/**
 * 恢复当前裁切区域内所有实体的原始高度
 * @returns {Promise<Object>} 恢复结果
 */
export function restoreClippingAreaElevation() {
  return new Promise((resolve, reject) => {
    try {
      // 获取当前裁切区域
      const polygon = getActiveClippingPolygon();
      if (!polygon) {
        reject(new Error('没有激活的裁切区域'));
        return;
      }

      // 获取裁切区域内的所有实体
      const entities = getEntitiesInClippingArea(polygon);
      if (entities.length === 0) {
        resolve({
          success: true,
          total: 0,
          message: '裁切区域内没有可恢复的实体'
        });
        return;
      }

      // 批量恢复高度
      const results = batchRestoreHeight(entities);
      resolve(results);
    } catch (error: any) {
      reject(error);
    }
  });
}

/**
 * 获取当前裁切区域的高度调整信息
 * @returns {Object} 高度调整信息
 */
export function getClippingElevationInfo() {
  try {
    // 获取裁切区域信息
    const clippingInfo = getClippingAreaInfo();
    if (!clippingInfo) {
      return {
        hasClipping: false,
        message: '没有激活的裁切区域'
      };
    }

    // 获取实体统计信息
    const entityStats = getEntityStatistics(clippingInfo.polygon);

    // 获取高度调整统计信息
    const heightStats = getHeightAdjustmentStats();

    return {
      hasClipping: true,
      clippingInfo: {
        vertexCount: clippingInfo.vertexCount,
        area: clippingInfo.area,
        bounds: clippingInfo.bounds,
        isValid: clippingInfo.isValid
      },
      entityStats: {
        total: entityStats.total,
        byType: entityStats.byType,
        bySource: entityStats.bySource,
        dataSources: entityStats.dataSources
      },
      heightStats: {
        savedHeightsCount: heightStats.savedHeightsCount,
        hasSavedHeights: heightStats.savedHeightsCount > 0
      },
      canAdjust: entityStats.total > 0,
      canRestore: heightStats.savedHeightsCount > 0
    };
  } catch (error: any) {
    console.error('Error getting clipping elevation info:', error);
    return {
      hasClipping: false,
      error: error.message
    };
  }
}

/**
 * 检查是否可以进行高度调整
 * @returns {Object} 检查结果
 */
export function canAdjustElevation() {
  const info = getClippingElevationInfo();

  if (!info.hasClipping) {
    return {
      canAdjust: false,
      reason: '没有激活的裁切区域',
      info
    };
  }

  if (!info.canAdjust) {
    return {
      canAdjust: false,
      reason: '裁切区域内没有可调整的实体',
      info
    };
  }

  return {
    canAdjust: true,
    reason: '可以进行高度调整',
    info
  };
}

/**
 * 检查是否可以进行高度恢复
 * @returns {Object} 检查结果
 */
export function canRestoreElevation() {
  const info = getClippingElevationInfo();

  if (!info.hasClipping) {
    return {
      canRestore: false,
      reason: '没有激活的裁切区域',
      info
    };
  }

  if (!info.canRestore) {
    return {
      canRestore: false,
      reason: '没有保存的原始高度记录',
      info
    };
  }

  return {
    canRestore: true,
    reason: '可以进行高度恢复',
    info
  };
}

/**
 * 清除所有高度调整相关数据
 */
export function clearElevationData() {
  clearAllOriginalHeights();
}

/**
 * 高程控制模块工具函数集合
 */
export const elevationUtils = {
  // 裁切区域相关
  getActiveClippingPolygon,
  hasActiveClipping,
  getClippingAreaInfo,

  // 实体相关
  getEntitiesInClippingArea,
  getEntityStatistics,
  getEntitiesInfo,

  // 高度调整相关
  adjustClippingAreaElevation,
  restoreClippingAreaElevation,
  getClippingElevationInfo,

  // 状态检查
  canAdjustElevation,
  canRestoreElevation,

  // 清理
  clearElevationData
};

export default elevationUtils;
