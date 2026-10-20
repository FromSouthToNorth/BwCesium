import { Cartographic, Cartesian3, Math as CesiumMath } from 'cesium';
import { getViewer, safeCesiumOperation } from '../helpers';
import { getEntityPosition } from './entitySelector';
import { isArray } from '../../is'

/**
 * 高度调整器模块
 * 提供实体高度调整的核心功能
 */

// 存储原始高度用于撤销操作
const originalHeights = new Map();

/**
 * 获取线实体的所有顶点高度
 * @param {Object} entity - Cesium线实体
 * @param {Object} viewer - Cesium viewer实例
 * @returns {number[]|null} 顶点高度数组（米），如果无法获取则返回null
 */
function getPolylineHeights(entity, viewer) {
  try {
    if (!entity.polyline || !entity.polyline.positions) {
      return null;
    }

    const positions = entity.polyline.positions.getValue
      ? entity.polyline.positions.getValue(viewer.clock.currentTime)
      : entity.polyline.positions;

    if (!isArray(positions) || positions.length === 0) {
      return null;
    }

    // 获取所有顶点的高度
    const heights: any[] = [];
    for (const position of positions) {
      try {
        const cartographic = Cartographic.fromCartesian(position);
        heights.push(cartographic.height);
      } catch (error: any) {
        // 如果某个顶点转换失败，使用null占位
        console.warn('Failed to convert polyline vertex to cartographic:', error);
        heights.push(null);
      }
    }

    return heights;
  } catch (error: any) {
    console.error('Error getting polyline heights:', error);
    return null;
  }
}

/**
 * 获取线体积实体的所有顶点高度
 * @param {Object} entity - Cesium线体积实体
 * @param {Object} viewer - Cesium viewer实例
 * @returns {Object|null} 顶点高度信息对象，如果无法获取则返回null
 */
function getPolylineVolumeHeights(entity, viewer) {
  try {
    if (!entity.polylineVolume || !entity.polylineVolume.positions) {
      return null;
    }

    const positions = entity.polylineVolume.positions.getValue
      ? entity.polylineVolume.positions.getValue(viewer.clock.currentTime)
      : entity.polylineVolume.positions;

    if (!isArray(positions) || positions.length === 0) {
      return null;
    }

    // 获取所有顶点的高度
    const heights: any[] = [];
    for (const position of positions) {
      try {
        const cartographic = Cartographic.fromCartesian(position);
        heights.push(cartographic.height);
      } catch (error: any) {
        // 如果某个顶点转换失败，使用null占位
        console.warn('Failed to convert polylineVolume vertex to cartographic:', error);
        heights.push(null);
      }
    }

    return {
      type: 'polylineVolume',
      heights: heights,
    };
  } catch (error: any) {
    console.error('Error getting polylineVolume heights:', error);
    return null;
  }
}

/**
 * 获取墙体实体的所有顶点高度
 * @param {Object} entity - Cesium墙体实体
 * @param {Object} viewer - Cesium viewer实例
 * @returns {Object|null} 顶点高度信息对象，如果无法获取则返回null
 */
function getWallHeights(entity, viewer) {
  try {
    if (!entity.wall || !entity.wall.positions) {
      return null;
    }

    const positions = entity.wall.positions.getValue
      ? entity.wall.positions.getValue(viewer.clock.currentTime)
      : entity.wall.positions;

    if (!isArray(positions) || positions.length === 0) {
      return null;
    }

    // 获取所有顶点的高度
    const heights: any[] = [];
    for (const position of positions) {
      try {
        const cartographic = Cartographic.fromCartesian(position);
        heights.push(cartographic.height);
      } catch (error: any) {
        // 如果某个顶点转换失败，使用null占位
        console.warn('Failed to convert wall vertex to cartographic:', error);
        heights.push(null);
      }
    }

    // 获取墙体的最小和最大高度（如果存在）
    let minimumHeights: any = null;
    let maximumHeights: any = null;
    if (entity.wall.minimumHeights) {
      minimumHeights = entity.wall.minimumHeights.getValue
        ? entity.wall.minimumHeights.getValue(viewer.clock.currentTime)
        : entity.wall.minimumHeights;
    }

    if (entity.wall.maximumHeights) {
      maximumHeights = entity.wall.maximumHeights.getValue
        ? entity.wall.maximumHeights.getValue(viewer.clock.currentTime)
        : entity.wall.maximumHeights;
    }

    return {
      type: 'wall',
      heights: heights,
      minimumHeights: minimumHeights,
      maximumHeights: maximumHeights
    };
  } catch (error: any) {
    console.error('Error getting wall heights:', error);
    return null;
  }
}

/**
 * 获取多边形实体的所有顶点高度
 * @param {Object} entity - Cesium多边形实体
 * @param {Object} viewer - Cesium viewer实例
 * @returns {Object|null} 顶点高度信息对象，如果无法获取则返回null
 */
function getPolygonHeights(entity, viewer) {
  try {
    if (!entity.polygon || !entity.polygon.hierarchy) {
      return null;
    }

    const hierarchy = entity.polygon.hierarchy.getValue
      ? entity.polygon.hierarchy.getValue(viewer.clock.currentTime)
      : entity.polygon.hierarchy;

    if (!hierarchy || !hierarchy.positions || !isArray(hierarchy.positions)) {
      return null;
    }

    // 获取外边界顶点的高度
    const boundaryHeights: any[] = [];
    for (const position of hierarchy.positions) {
      try {
        const cartographic = Cartographic.fromCartesian(position);
        boundaryHeights.push(cartographic.height);
      } catch (error: any) {
        console.warn('Failed to convert polygon boundary vertex to cartographic:', error);
        boundaryHeights.push(null);
      }
    }

    // 获取孔洞顶点的高度
    const holeHeights: any[] = [];
    if (hierarchy.holes && isArray(hierarchy.holes)) {
      for (const hole of hierarchy.holes) {
        if (hole.positions && isArray(hole.positions)) {
          const holeHeightArray: any[] = [];
          for (const position of hole.positions) {
            try {
              const cartographic = Cartographic.fromCartesian(position);
              holeHeightArray.push(cartographic.height);
            } catch (error: any) {
              console.warn('Failed to convert hole vertex to cartographic:', error);
              holeHeightArray.push(null);
            }
          }
          holeHeights.push(holeHeightArray);
        }
      }
    }

    // 获取多边形的高度属性（如果存在）
    let polygonHeight: any = null;
    if (entity.polygon.height !== undefined) {
      polygonHeight = typeof entity.polygon.height.getValue === 'function'
        ? entity.polygon.height.getValue(viewer.clock.currentTime)
        : entity.polygon.height;
    }

    return {
      boundary: boundaryHeights,
      holes: holeHeights,
      polygonHeight: polygonHeight
    };
  } catch (error: any) {
    console.error('Error getting polygon heights:', error);
    return null;
  }
}

/**
 * 获取模型实体的高度
 * @param {Object} entity - Cesium模型实体
 * @param {Object} viewer - Cesium viewer实例
 * @returns {number|null} 模型高度（米），如果无法获取则返回null
 */
function getModelHeight(entity, viewer) {
  // 模型实体通常通过position获取高度
  const position = getEntityPosition(entity, viewer);
  if (!position) return null;

  try {
    const cartographic = Cartographic.fromCartesian(position);
    return cartographic.height;
  } catch (error: any) {
    console.error('Error getting model height:', error);
    return null;
  }
}

/**
 * 获取实体的高度信息
 * @param {Object} entity - Cesium实体
 * @param {Object} viewer - Cesium viewer实例
 * @returns {Object|null} 高度信息对象，如果无法获取则返回null
 */
export function getEntityHeight(entity, viewer) {
  try {
    // 根据实体类型调用不同的高度获取方法
    if (entity.polyline) {
      // // 线实体 - 检查是否有 polylineVolume 属性
      let volumeHeights: any = null;
      if (entity.polylineVolume) {
        // 线体积实体 - 返回所有顶点高度数组和长度数组
        volumeHeights = getPolylineVolumeHeights(entity, viewer);
      }
      // 普通线实体 - 返回所有顶点高度数组
      const heights = getPolylineHeights(entity, viewer);

      if (!heights) return null;

      return {
        type: 'polyline',
        heights: heights,
        volumeHeights
      };
    } else if (entity.polygon) {
      // 多边形实体 - 返回边界和孔洞的高度信息
      const heights = getPolygonHeights(entity, viewer);
      if (!heights) return null;

      return {
        type: 'polygon',
        boundary: heights.boundary,
        holes: heights.holes,
        polygonHeight: heights.polygonHeight
      };
    } else if (entity.wall) {
      // 墙体实体 - 返回所有顶点高度信息
      const wallHeights = getWallHeights(entity, viewer);
      if (!wallHeights) return null;

      return {
        type: 'wall',
        heights: wallHeights.heights,
        minimumHeights: wallHeights.minimumHeights,
        maximumHeights: wallHeights.maximumHeights
      };
    } else if (entity.model) {
      // 模型实体 - 返回单个高度值
      const height = getModelHeight(entity, viewer);
      if (height === null) return null;

      return {
        type: 'model',
        height: height
      };
    } else {
      // 其他实体（点实体、标签等） - 返回单个高度值
      const position = getEntityPosition(entity, viewer);
      if (!position) return null;

      const cartographic = Cartographic.fromCartesian(position);
      return {
        type: 'point',
        height: cartographic.height
      };
    }
  } catch (error: any) {
    console.error('Error getting entity height:', error);
    return null;
  }
}

/**
 * 清除实体的原始高度记录
 * @param {string} entityId - 实体ID
 */
export function clearOriginalHeight(entityId) {
  originalHeights.delete(entityId);
}

/**
 * 调整点实体（billboard、point等）的高度
 * @param {Object} entity - Cesium实体
 * @param {number} newHeight - 新高度（米）
 * @param {Object} viewer - Cesium viewer实例
 * @returns {boolean} 是否成功调整
 */
function adjustPointEntity(entity, newHeight, viewer) {
  try {
    const position = getEntityPosition(entity, viewer);
    if (!position) return false;

    const cartographic = Cartographic.fromCartesian(position);
    cartographic.height = newHeight;
    const newPosition = Cartographic.toCartesian(cartographic);

    // 更新实体位置
    if (typeof entity.position.setValue === 'function') {
      entity.position.setValue(newPosition);
    } else {
      entity.position = newPosition;
    }

    return true;
  } catch (error: any) {
    console.error('Error adjusting point entity height:', error);
    return false;
  }
}

/**
 * 调整线实体（polyline）的高度
 * @param {Object} entity - Cesium实体
 * @param {number} offset - 高度偏移量（米）
 * @param {Object} viewer - Cesium viewer实例
 * @returns {boolean} 是否成功调整
 */
function adjustPolylineEntity(entity, offset, viewer) {
  try {
    if (!entity.polyline || !entity.polyline.positions) {
      return false;
    }

    const positions = entity.polyline.positions.getValue
      ? entity.polyline.positions.getValue(viewer.clock.currentTime)
      : entity.polyline.positions;

    if (!isArray(positions) || positions.length === 0) {
      return false;
    }

    if (entity.polylineVolume) {
      // 如果是线体积实体，调整线体积实体的高度
      adjustPolylineVolumeEntity(entity, offset, viewer);
    }

    // 创建新的位置数组，每个点都调整高度
    const newPositions = positions.map(position => {
      const cartographic = Cartographic.fromCartesian(position);
      cartographic.height += offset;
      return Cartographic.toCartesian(cartographic);
    });

    // 更新线实体的位置
    if (typeof entity.polyline.positions.setValue === 'function') {
      entity.polyline.positions.setValue(newPositions);
    } else {
      entity.polyline.positions = newPositions;
    }

    return true;
  } catch (error: any) {
    console.error('Error adjusting polyline entity height:', error);
    return false;
  }
}

/**
 * 调整面实体（polygon）的高度
 * @param {Object} entity - Cesium实体
 * @param {number} offset - 高度偏移量（米）
 * @param {Object} viewer - Cesium viewer实例
 * @returns {boolean} 是否成功调整
 */
function adjustPolygonEntity(entity, offset, viewer) {
  try {
    if (!entity.polygon || !entity.polygon.hierarchy) {
      return false;
    }

    const hierarchy = entity.polygon.hierarchy.getValue
      ? entity.polygon.hierarchy.getValue(viewer.clock.currentTime)
      : entity.polygon.hierarchy;

    if (!hierarchy || !hierarchy.positions || !isArray(hierarchy.positions)) {
      return false;
    }

    // 创建新的位置数组，每个点都调整高度
    const newPositions = hierarchy.positions.map(position => {
      const cartographic = Cartographic.fromCartesian(position);
      cartographic.height += offset;
      return Cartographic.toCartesian(cartographic);
    });

    // 创建新的层级结构
    const newHierarchy = {
      positions: newPositions,
      holes: hierarchy.holes ? hierarchy.holes.map(hole => ({
        positions: hole.positions.map(position => {
          const cartographic = Cartographic.fromCartesian(position);
          cartographic.height += offset;
          return Cartographic.toCartesian(cartographic);
        })
      })) : []
    };

    // 更新面实体的层级
    if (typeof entity.polygon.hierarchy.setValue === 'function') {
      entity.polygon.hierarchy.setValue(newHierarchy);
    } else {
      entity.polygon.hierarchy = newHierarchy;
    }

    // 如果面实体有高度属性，也进行调整
    if (entity.polygon.height !== undefined) {
      const currentHeight = typeof entity.polygon.height.getValue === 'function'
        ? entity.polygon.height.getValue(viewer.clock.currentTime)
        : entity.polygon.height;

      if (typeof entity.polygon.height.setValue === 'function') {
        entity.polygon.height.setValue(currentHeight + offset);
      } else {
        entity.polygon.height = currentHeight + offset;
      }
    }

    return true;
  } catch (error: any) {
    console.error('Error adjusting polygon entity height:', error);
    return false;
  }
}

/**
 * 调整线体积实体（polylineVolume）的高度
 * @param {Object} entity - Cesium线体积实体
 * @param {number} offset - 高度偏移量（米）
 * @param {Object} viewer - Cesium viewer实例
 * @returns {boolean} 是否成功调整
 */
function adjustPolylineVolumeEntity(entity, offset, viewer) {
  try {
    if (!entity.polylineVolume || !entity.polylineVolume.positions) {
      return false;
    }

    const positions = entity.polylineVolume.positions.getValue
      ? entity.polylineVolume.positions.getValue(viewer.clock.currentTime)
      : entity.polylineVolume.positions;


    if (!isArray(positions) || positions.length === 0) {
      return false;
    }

    // 创建新的位置数组，每个点都调整高度
    const newPositions = positions.map(position => {
      const cartographic = Cartographic.fromCartesian(position);
      cartographic.height += offset;
      return Cartographic.toCartesian(cartographic);
    });

    // 更新线体积实体的位置和长度
    if (typeof entity.polylineVolume.positions.setValue === 'function') {
      entity.polylineVolume.positions.setValue(newPositions);
    } else {
      entity.polylineVolume.positions = newPositions;
    }

    return true;
  } catch (error: any) {
    console.error('Error adjusting polylineVolume entity height:', error);
    return false;
  }
}

/**
 * 调整墙体实体（wall）的高度
 * @param {Object} entity - Cesium墙体实体
 * @param {number} offset - 高度偏移量（米）
 * @param {Object} viewer - Cesium viewer实例
 * @returns {boolean} 是否成功调整
 */
function adjustWallEntity(entity, offset, viewer) {
  try {
    if (!entity.wall || !entity.wall.positions) {
      return false;
    }

    const positions = entity.wall.positions.getValue
      ? entity.wall.positions.getValue(viewer.clock.currentTime)
      : entity.wall.positions;

    if (!isArray(positions) || positions.length === 0) {
      return false;
    }

    // 创建新的位置数组，每个点都调整高度
    const newPositions = positions.map(position => {
      const cartographic = Cartographic.fromCartesian(position);
      cartographic.height += offset;
      return Cartographic.toCartesian(cartographic);
    });

    // 更新墙体实体的位置
    if (typeof entity.wall.positions.setValue === 'function') {
      entity.wall.positions.setValue(newPositions);
    } else {
      entity.wall.positions = newPositions;
    }

    // 如果墙体有最小高度属性，也进行调整
    if (entity.wall.minimumHeights !== undefined) {
      const currentMinimumHeights = typeof entity.wall.minimumHeights.getValue === 'function'
        ? entity.wall.minimumHeights.getValue(viewer.clock.currentTime)
        : entity.wall.minimumHeights;

      if (isArray(currentMinimumHeights)) {
        const newMinimumHeights = currentMinimumHeights.map(height => height + offset);
        if (typeof entity.wall.minimumHeights.setValue === 'function') {
          entity.wall.minimumHeights.setValue(newMinimumHeights);
        } else {
          entity.wall.minimumHeights = newMinimumHeights;
        }
      }
    }

    // 如果墙体有最大高度属性，也进行调整
    if (entity.wall.maximumHeights !== undefined) {
      const currentMaximumHeights = typeof entity.wall.maximumHeights.getValue === 'function'
        ? entity.wall.maximumHeights.getValue(viewer.clock.currentTime)
        : entity.wall.maximumHeights;

      if (isArray(currentMaximumHeights)) {
        const newMaximumHeights = currentMaximumHeights.map(height => height + offset);
        if (typeof entity.wall.maximumHeights.setValue === 'function') {
          entity.wall.maximumHeights.setValue(newMaximumHeights);
        } else {
          entity.wall.maximumHeights = newMaximumHeights;
        }
      }
    }

    return true;
  } catch (error: any) {
    console.error('Error adjusting wall entity height:', error);
    return false;
  }
}

/**
 * 调整模型实体（model）的高度
 * @param {Object} entity - Cesium实体
 * @param {number} newHeight - 新高度（米）
 * @param {Object} viewer - Cesium viewer实例
 * @returns {boolean} 是否成功调整
 */
function adjustModelEntity(entity, newHeight, viewer) {
  // 模型实体通常通过position调整高度
  return adjustPointEntity(entity, newHeight, viewer);
}

/**
 * 恢复线实体的原始高度
 * @param {Object} entity - Cesium线实体
 * @param {Object} originalHeightInfo - 原始高度信息
 * @param {Object} viewer - Cesium viewer实例
 * @returns {boolean} 是否成功恢复
 */
function restorePolylineHeight(entity, originalHeightInfo, viewer) {
  try {
    if (!entity.polyline || !entity.polyline.positions) {
      return false;
    }

    const positions = entity.polyline.positions.getValue
      ? entity.polyline.positions.getValue(viewer.clock.currentTime)
      : entity.polyline.positions;

    if (!isArray(positions) || positions.length === 0) {
      return false;
    }

    // 检查原始高度数组长度是否匹配
    if (originalHeightInfo.heights.length !== positions.length) {
      console.error('原始高度数组长度不匹配');
      return false;
    }
    if (entity.polylineVolume && originalHeightInfo.volumeHeights) {
      restorePolylineVolumeHeight(entity, originalHeightInfo.volumeHeights, viewer);
    }

    // 创建新的位置数组，每个点都恢复到原始高度
    const newPositions = positions.map((position, index) => {
      const originalHeight = originalHeightInfo.heights[index];
      if (originalHeight === null) {
        // 如果原始高度为null，保持当前位置不变
        return position;
      }

      const cartographic = Cartographic.fromCartesian(position);
      cartographic.height = originalHeight;
      return Cartographic.toCartesian(cartographic);
    });

    // 更新线实体的位置
    if (typeof entity.polyline.positions.setValue === 'function') {
      entity.polyline.positions.setValue(newPositions);
    } else {
      entity.polyline.positions = newPositions;
    }

    return true;
  } catch (error: any) {
    console.error('Error restoring polyline height:', error);
    return false;
  }
}

/**
 * 恢复多边形实体的原始高度
 * @param {Object} entity - Cesium多边形实体
 * @param {Object} originalHeightInfo - 原始高度信息
 * @param {Object} viewer - Cesium viewer实例
 * @returns {boolean} 是否成功恢复
 */
function restorePolygonHeight(entity, originalHeightInfo, viewer) {
  try {
    if (!entity.polygon || !entity.polygon.hierarchy) {
      return false;
    }

    const hierarchy = entity.polygon.hierarchy.getValue
      ? entity.polygon.hierarchy.getValue(viewer.clock.currentTime)
      : entity.polygon.hierarchy;

    if (!hierarchy || !hierarchy.positions || !isArray(hierarchy.positions)) {
      return false;
    }

    // 检查原始高度数组长度是否匹配
    if (originalHeightInfo.boundary.length !== hierarchy.positions.length) {
      console.error('原始边界高度数组长度不匹配');
      return false;
    }

    // 恢复边界顶点的高度
    const newPositions = hierarchy.positions.map((position, index) => {
      const originalHeight = originalHeightInfo.boundary[index];
      if (originalHeight === null) {
        // 如果原始高度为null，保持当前位置不变
        return position;
      }

      const cartographic = Cartographic.fromCartesian(position);
      cartographic.height = originalHeight;
      return Cartographic.toCartesian(cartographic);
    });

    // 恢复孔洞顶点的高度
    const newHoles: any[] = [];
    if (hierarchy.holes && isArray(hierarchy.holes)) {
      for (let i = 0; i < hierarchy.holes.length; i++) {
        const hole = hierarchy.holes[i];
        if (hole.positions && isArray(hole.positions)) {
          // 检查孔洞高度数组长度是否匹配
          if (i < originalHeightInfo.holes.length &&
            originalHeightInfo.holes[i].length === hole.positions.length) {

            const newHolePositions = hole.positions.map((position, j) => {
              const originalHeight = originalHeightInfo.holes[i][j];
              if (originalHeight === null) {
                return position;
              }

              const cartographic = Cartographic.fromCartesian(position);
              cartographic.height = originalHeight;
              return Cartographic.toCartesian(cartographic);
            });

            newHoles.push({ positions: newHolePositions });
          } else {
            // 如果长度不匹配，保持原孔洞不变
            newHoles.push(hole);
          }
        }
      }
    }

    // 创建新的层级结构
    const newHierarchy = {
      positions: newPositions,
      holes: newHoles
    };

    // 更新面实体的层级
    if (typeof entity.polygon.hierarchy.setValue === 'function') {
      entity.polygon.hierarchy.setValue(newHierarchy);
    } else {
      entity.polygon.hierarchy = newHierarchy;
    }

    // 如果面实体有高度属性，也进行恢复
    if (entity.polygon.height !== undefined) {
      // 使用保存的原始多边形高度，如果存在的话
      if (originalHeightInfo.polygonHeight !== null && originalHeightInfo.polygonHeight !== undefined) {
        if (typeof entity.polygon.height.setValue === 'function') {
          entity.polygon.height.setValue(originalHeightInfo.polygonHeight);
        } else {
          entity.polygon.height = originalHeightInfo.polygonHeight;
        }
      } else {
        // 如果没有保存的多边形高度，计算边界平均高度作为面实体的高度
        const validHeights = originalHeightInfo.boundary.filter(h => h !== null);
        if (validHeights.length > 0) {
          const averageHeight = validHeights.reduce((sum, h) => sum + h, 0) / validHeights.length;

          if (typeof entity.polygon.height.setValue === 'function') {
            entity.polygon.height.setValue(averageHeight);
          } else {
            entity.polygon.height = averageHeight;
          }
        }
      }
    }

    return true;
  } catch (error: any) {
    console.error('Error restoring polygon height:', error);
    return false;
  }
}

/**
 * 恢复线体积实体的原始高度
 * @param {Object} entity - Cesium线体积实体
 * @param {Object} originalHeightInfo - 原始高度信息
 * @param {Object} viewer - Cesium viewer实例
 * @returns {boolean} 是否成功恢复
 */
function restorePolylineVolumeHeight(entity, originalHeightInfo, viewer) {
  try {
    if (!entity.polylineVolume || !entity.polylineVolume.positions) {
      return false;
    }

    const positions = entity.polylineVolume.positions.getValue
      ? entity.polylineVolume.positions.getValue(viewer.clock.currentTime)
      : entity.polylineVolume.positions;

    if (!isArray(positions) || positions.length === 0) {
      return false;
    }

    // 检查原始高度数组长度是否匹配
    if (originalHeightInfo.heights.length !== positions.length) {
      console.error('原始高度数组长度不匹配');
      return false;
    }

    // 创建新的位置数组，每个点都恢复到原始高度
    const newPositions = positions.map((position, index) => {
      const originalHeight = originalHeightInfo.heights[index];
      if (originalHeight === null) {
        // 如果原始高度为null，保持当前位置不变
        return position;
      }

      const cartographic = Cartographic.fromCartesian(position);
      cartographic.height = originalHeight;
      return Cartographic.toCartesian(cartographic);
    });

    // 更新线体积实体的位置和长度
    if (typeof entity.polylineVolume.positions.setValue === 'function') {
      entity.polylineVolume.positions.setValue(newPositions);
    } else {
      entity.polylineVolume.positions = newPositions;
    }

    return true;
  } catch (error: any) {
    console.error('Error restoring polylineVolume height:', error);
    return false;
  }
}

/**
 * 恢复墙体实体的原始高度
 * @param {Object} entity - Cesium墙体实体
 * @param {Object} originalHeightInfo - 原始高度信息
 * @param {Object} viewer - Cesium viewer实例
 * @returns {boolean} 是否成功恢复
 */
function restoreWallHeight(entity, originalHeightInfo, viewer) {
  try {
    if (!entity.wall || !entity.wall.positions) {
      return false;
    }

    const positions = entity.wall.positions.getValue
      ? entity.wall.positions.getValue(viewer.clock.currentTime)
      : entity.wall.positions;

    if (!isArray(positions) || positions.length === 0) {
      return false;
    }

    // 检查原始高度数组长度是否匹配
    if (originalHeightInfo.heights.length !== positions.length) {
      console.error('原始高度数组长度不匹配');
      return false;
    }

    // 创建新的位置数组，每个点都恢复到原始高度
    const newPositions = positions.map((position, index) => {
      const originalHeight = originalHeightInfo.heights[index];
      if (originalHeight === null) {
        // 如果原始高度为null，保持当前位置不变
        return position;
      }

      const cartographic = Cartographic.fromCartesian(position);
      cartographic.height = originalHeight;
      return Cartographic.toCartesian(cartographic);
    });

    // 更新墙体实体的位置
    if (typeof entity.wall.positions.setValue === 'function') {
      entity.wall.positions.setValue(newPositions);
    } else {
      entity.wall.positions = newPositions;
    }

    // 如果墙体有最小高度属性，也进行恢复
    if (entity.wall.minimumHeights !== undefined && originalHeightInfo.minimumHeights) {
      const currentMinimumHeights = typeof entity.wall.minimumHeights.getValue === 'function'
        ? entity.wall.minimumHeights.getValue(viewer.clock.currentTime)
        : entity.wall.minimumHeights;

      if (isArray(currentMinimumHeights) && isArray(originalHeightInfo.minimumHeights) &&
        currentMinimumHeights.length === originalHeightInfo.minimumHeights.length) {

        if (typeof entity.wall.minimumHeights.setValue === 'function') {
          entity.wall.minimumHeights.setValue(originalHeightInfo.minimumHeights);
        } else {
          entity.wall.minimumHeights = originalHeightInfo.minimumHeights;
        }
      }
    }

    // 如果墙体有最大高度属性，也进行恢复
    if (entity.wall.maximumHeights !== undefined && originalHeightInfo.maximumHeights) {
      const currentMaximumHeights = typeof entity.wall.maximumHeights.getValue === 'function'
        ? entity.wall.maximumHeights.getValue(viewer.clock.currentTime)
        : entity.wall.maximumHeights;

      if (isArray(currentMaximumHeights) && isArray(originalHeightInfo.maximumHeights) &&
        currentMaximumHeights.length === originalHeightInfo.maximumHeights.length) {

        if (typeof entity.wall.maximumHeights.setValue === 'function') {
          entity.wall.maximumHeights.setValue(originalHeightInfo.maximumHeights);
        } else {
          entity.wall.maximumHeights = originalHeightInfo.maximumHeights;
        }
      }
    }

    return true;
  } catch (error: any) {
    console.error('Error restoring wall height:', error);
    return false;
  }
}

/**
 * 根据实体类型调整高度
 * @param {Object} entity - Cesium实体
 * @param {number} offset - 高度偏移量（米），正数为抬升，负数为下降
 * @param {Object} viewer - Cesium viewer实例
 * @returns {Object} 调整结果
 */
export function adjustEntityHeight(entity, offset, viewer) {
  const entityId = entity.id || `entity_${Date.now()}_${Math.random()}`;
  const heightInfo = getEntityHeight(entity, viewer);

  if (heightInfo === null) {
    return {
      success: false,
      entityId,
      error: '无法获取实体高度信息'
    };
  }

  // 保存原始高度信息（如果尚未保存）
  if (!originalHeights.has(entityId)) {
    // 根据实体类型保存不同的高度信息
    if (heightInfo.type === 'polyline') {
      // 保存线实体的高度数组
      originalHeights.set(entityId, {
        type: 'polyline',
        heights: heightInfo.heights,
        volumeHeights: heightInfo.volumeHeights || null
      });
    } else if (heightInfo.type === 'polygon') {
      // 保存多边形实体的高度信息
      originalHeights.set(entityId, {
        type: 'polygon',
        boundary: heightInfo.boundary,
        holes: heightInfo.holes,
        polygonHeight: heightInfo.polygonHeight
      });
    } else if (heightInfo.type === 'wall') {
      // 保存墙体实体的高度信息
      originalHeights.set(entityId, {
        type: 'wall',
        heights: heightInfo.heights,
        minimumHeights: heightInfo.minimumHeights,
        maximumHeights: heightInfo.maximumHeights
      });
    } else {
      // 保存点实体或模型实体的高度值
      originalHeights.set(entityId, {
        type: heightInfo.type,
        height: heightInfo.height
      });
    }
  }

  let success = false;
  let error: any = null;
  let newHeightInfo: any = null;
  try {
    // 根据实体类型调用不同的调整方法
    if (entity.polyline) {
      // 普通线实体
      success = adjustPolylineEntity(entity, offset, viewer);
      if (success) {
        // 计算调整后的高度信息
        const newHeights = heightInfo.heights?.map(h => h !== null ? h + offset : null);
        newHeightInfo = {
          type: 'polyline',
          heights: newHeights,
        };
      }
    } else if (entity.polygon) {
      // 面实体
      success = adjustPolygonEntity(entity, offset, viewer);
      if (success) {
        // 计算调整后的高度信息
        const newBoundary = heightInfo.boundary?.map(h => h !== null ? h + offset : null);
        const newHoles = heightInfo.holes?.map(hole =>
          hole.map(h => h !== null ? h + offset : null)
        );

        newHeightInfo = {
          type: 'polygon',
          boundary: newBoundary,
          holes: newHoles,
        };
      }
    } else if (entity.wall) {
      // 墙体实体
      success = adjustWallEntity(entity, offset, viewer);
      if (success) {
        // 计算调整后的高度信息
        const newHeights = heightInfo.heights?.map(h => h !== null ? h + offset : null);
        let newMinimumHeights: any = null;
        let newMaximumHeights: any = null;
        if (heightInfo.minimumHeights && isArray(heightInfo.minimumHeights)) {
          newMinimumHeights = heightInfo.minimumHeights.map(h => h + offset);
        }

        if (heightInfo.maximumHeights && isArray(heightInfo.maximumHeights)) {
          newMaximumHeights = heightInfo.maximumHeights.map(h => h + offset);
        }

        newHeightInfo = {
          type: 'wall',
          heights: newHeights,
          minimumHeights: newMinimumHeights,
          maximumHeights: newMaximumHeights
        };
      }
    } else if (entity.model) {
      // 模型实体
      const newHeight = heightInfo.height + offset;
      success = adjustModelEntity(entity, newHeight, viewer);
      if (success) {
        newHeightInfo = {
          type: 'model',
          height: newHeight
        };
      }
    } else if (entity.position) {
      // 其他有位置的实体（点实体、标签等）
      const newHeight = heightInfo.height + offset;
      success = adjustPointEntity(entity, newHeight, viewer);
      if (success) {
        newHeightInfo = {
          type: 'point',
          height: newHeight
        };
      }
    } else {
      error = '不支持的实体类型';
    }

    if (!success && !error) {
      error = '高度调整失败';
    }
  } catch (err: any) {
    success = false;
    error = err.message;
    console.error('Error in adjustEntityHeight:', err);
  }

  return {
    success,
    entityId,
    originalHeight: heightInfo,
    newHeight: newHeightInfo,
    offset,
    error
  };
}

/**
 * 批量调整实体高度
 * @param {Array} entities - 实体数组（来自getEntitiesInClippingArea的结果）
 * @param {number} offset - 高度偏移量（米）
 * @returns {Object} 批量调整结果
 */
export function batchAdjustHeight(entities, offset) {

  return safeCesiumOperation((viewer) => {
    const results = {
      total: entities.length,
      success: 0,
      failed: 0,
      details: [] as any[],
      startTime: Date.now()
    };

    entities.forEach((item, index) => {
      const result: any = adjustEntityHeight(item.entity, offset, viewer);
      result.index = index;
      result.source = item.source;
      result.type = item.type;
      result.dataSourceName = item.dataSourceName;

      results.details.push(result);

      if (result.success) {
        results.success++;
      } else {
        results.failed++;
      }
    });

    (results as any).endTime = Date.now();
    (results as any).duration = (results as any).endTime - (results as any).startTime;

    return results;
  }, '批量调整高度失败');
}

/**
 * 恢复实体的原始高度
 * @param {Object} entity - Cesium实体
 * @param {Object} viewer - Cesium viewer实例
 * @returns {Object} 恢复结果
 */
export function restoreEntityHeight(entity, viewer) {
  const entityId = entity.id;
  if (!entityId || !originalHeights.has(entityId)) {
    return {
      success: false,
      entityId,
      error: '没有保存的原始高度记录'
    };
  }

  const originalHeightInfo = originalHeights.get(entityId);
  const currentHeightInfo = getEntityHeight(entity, viewer);

  if (currentHeightInfo === null) {
    return {
      success: false,
      entityId,
      error: '无法获取当前高度信息'
    };
  }

  let success = false;
  let error: any = null;
  let offset = 0;

  try {
    if (originalHeightInfo.type === 'polyline') {
      // 普通线实体：为每个顶点单独恢复原始高度
      success = restorePolylineHeight(entity, originalHeightInfo, viewer);
      if (success) {
      } else {
        error = '线实体高度恢复失败';
      }
    } else if (originalHeightInfo.type === 'polygon') {
      // 多边形实体：为每个顶点单独恢复原始高度
      success = restorePolygonHeight(entity, originalHeightInfo, viewer);
      if (success) {
      } else {
        error = '多边形实体高度恢复失败';
      }
    } else if (originalHeightInfo.type === 'wall') {
      // 墙体实体：为每个顶点单独恢复原始高度
      success = restoreWallHeight(entity, originalHeightInfo, viewer);
      if (success) {
      } else {
        error = '墙体实体高度恢复失败';
      }
    } else {
      // 点实体或模型实体：计算单个高度的偏移量
      offset = (originalHeightInfo.height ?? 0) - (currentHeightInfo.height ?? 0);
      const result = adjustEntityHeight(entity, offset, viewer);
      success = result.success;
      error = result.error;
    }

    // 如果恢复成功，清除原始高度记录
    if (success) {
      clearOriginalHeight(entityId);
    }
  } catch (err: any) {
    success = false;
    error = err.message;
    console.error('Error in restoreEntityHeight:', err);
  }

  return {
    success,
    entityId,
    restored: success,
    originalHeight: originalHeightInfo,
    offset,
    error
  };
}

/**
 * 批量恢复实体原始高度
 * @param {Array} entities - 实体数组
 * @returns {Object} 批量恢复结果
 */
export function batchRestoreHeight(entities) {
  return safeCesiumOperation((viewer) => {
    const results = {
      total: entities.length,
      restored: 0,
      failed: 0,
      details: [] as any[],
      startTime: Date.now()
    };

    entities.forEach((item, index) => {
      const result: any = restoreEntityHeight(item.entity, viewer);
      result.index = index;
      result.source = item.source;
      result.type = item.type;

      results.details.push(result);

      if (result.restored) {
        results.restored++;
      } else {
        results.failed++;
      }
    });

    (results as any).endTime = Date.now();
    (results as any).duration = (results as any).endTime - (results as any).startTime;

    return results;
  }, '批量恢复高度失败');
}

/**
 * 清除所有原始高度记录
 */
export function clearAllOriginalHeights() {
  originalHeights.clear();
}

/**
 * 获取已保存原始高度的实体数量
 * @returns {number} 实体数量
 */
export function getSavedHeightsCount() {
  return originalHeights.size;
}

/**
 * 获取高度调整统计信息
 * @returns {Object} 统计信息
 */
export function getHeightAdjustmentStats() {
  return {
    savedHeightsCount: getSavedHeightsCount(),
    entities: Array.from(originalHeights.entries()).map(([id, height]) => ({
      id,
      originalHeight: height
    }))
  };
}
