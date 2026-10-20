import { Cartographic, Math as CesiumMath, BoundingSphere } from 'cesium';
import { getViewer, safeCesiumOperation } from '../helpers';
import { isPointInPolygon } from './clippingIntegration';
import { isArray } from '../../is'

/**
 * 实体选择器模块
 * 提供裁切范围内实体的筛选和统计功能
 */

function getEntity(entity) {
  const { polygon, polyline } = entity;
  return polygon || polyline || entity;
}

/**
 * 获取实体的位置
 * @param {Object} entity - Cesium实体
 * @param {Object} viewer - Cesium viewer实例
 * @returns {Cartesian3|null} 实体位置
 */
export function getEntityPosition(entity, viewer) {
  const _entity = getEntity(entity);
  if (!_entity || !_entity.position) return null;

  try {
    if (typeof _entity.position.getValue === 'function') {
      return _entity.position.getValue(viewer.clock.currentTime);
    }
    return _entity.position;
  } catch (error) {
    console.error('Error getting entity position:', error);
    return null;
  }
}


/**
 * 获取线实体的顶点位置
 * @param {Object} entity - Cesium线实体
 * @param {Object} viewer - Cesium viewer实例
 * @returns {Cartesian3[]|null} 顶点位置数组
 */
function getPolylinePositions(entity, viewer) {
  if (!entity.polyline || !entity.polyline.positions) return null;

  try {
    const positions = entity.polyline.positions.getValue
      ? entity.polyline.positions.getValue(viewer.clock.currentTime)
      : entity.polyline.positions;

    return isArray(positions) ? positions : null;
  } catch (error) {
    console.error('Error getting polyline positions:', error);
    return null;
  }
}

/**
 * 获取墙体实体的顶点位置
 * @param {Object} entity - Cesium墙体实体
 * @param {Object} viewer - Cesium viewer实例
 * @returns {Cartesian3[]|null} 顶点位置数组
 */
function getWallPositions(entity, viewer) {
  if (!entity.wall || !entity.wall.positions) return null;

  try {
    const positions = entity.wall.positions.getValue
      ? entity.wall.positions.getValue(viewer.clock.currentTime)
      : entity.wall.positions;

    if (!isArray(positions) || positions.length === 0) {
      return null;
    }

    return positions;
  } catch (error) {
    console.error('Error getting wall positions:', error);
    return null;
  }
}


/**
 * 获取多边形实体的顶点位置
 * @param {Object} entity - Cesium多边形实体
 * @param {Object} viewer - Cesium viewer实例
 * @returns {Cartesian3[]|null} 顶点位置数组
 */
function getPolygonPositions(entity, viewer) {
  if (!entity.polygon || !entity.polygon.hierarchy) return null;

  try {
    const hierarchy = entity.polygon.hierarchy.getValue
      ? entity.polygon.hierarchy.getValue(viewer.clock.currentTime)
      : entity.polygon.hierarchy;

    if (!hierarchy || !hierarchy.positions || !isArray(hierarchy.positions)) {
      return null;
    }

    return hierarchy.positions;
  } catch (error) {
    console.error('Error getting polygon positions:', error);
    return null;
  }
}

/**
 * 判断实体是否在裁切多边形内
 * @param {Object} entity - Cesium实体
 * @param {Cartesian3[]} polygon - 裁切多边形顶点数组
 * @param {Object} viewer - Cesium viewer实例
 * @returns {boolean} 实体是否在裁切多边形内
 */
export function isEntityInPolygon(entity, polygon, viewer) {
  if (!entity || !polygon || polygon.length < 3) return false;

  const entityType = getEntityType(entity);

  // 对于点实体（billboard、point、model、label等），检查位置点
  if (entityType === 'point' || entityType === 'model' || entityType === 'label' ||
    entityType === 'cylinder' || entityType === 'box' || entityType === 'ellipsoid') {

    const position = getEntityPosition(entity, viewer);
    if (!position) return false;

    return isPointInPolygon(position, polygon);
  }

  // 对于线实体，检查是否有顶点在裁切多边形内
  if (entityType === 'line') {
    const positions = getPolylinePositions(entity, viewer);
    if (!positions || positions.length === 0) return false;

    // 如果线的任何一个顶点在裁切多边形内，则认为线在裁切区域内
    for (const position of positions) {
      if (isPointInPolygon(position, polygon)) {
        return true;
      }
    }
    return false;
  }

  // 对于多边形实体，检查是否有顶点在裁切多边形内
  if (entityType === 'polygon') {
    const positions = getPolygonPositions(entity, viewer);
    if (!positions || positions.length === 0) return false;

    // 如果多边形的任何一个顶点在裁切多边形内，则认为多边形在裁切区域内
    for (const position of positions) {
      if (isPointInPolygon(position, polygon)) {
        return true;
      }
    }
    return false;
  }

  // 对于多边形实体，检查是否有顶点在裁切多边形内
  if (entityType === 'wall') {
    const positions = getWallPositions(entity, viewer);
    if (!positions || positions.length === 0) return false;

    // 如果多边形的任何一个顶点在裁切多边形内，则认为多边形在裁切区域内
    for (const position of positions) {
      if (isPointInPolygon(position, polygon)) {
        return true;
      }
    }
    return false;
  }

  // 对于其他类型的实体，尝试获取位置点
  const position = getEntityPosition(entity, viewer);
  if (!position) return false;

  return isPointInPolygon(position, polygon);
}

/**
 * 获取实体类型
 * @param {Object} entity - Cesium实体
 * @returns {string} 实体类型标识
 */
export function getEntityType(entity) {
  if (!entity) return 'unknown';
  if (entity.billboard || (entity.position && !entity.polyline && !entity.polygon)) {
    return 'point';
  } else if (entity.polyline) {
    return 'line';
  } else if (entity.polygon) {
    return 'polygon';
  } else if (entity.model) {
    return 'model';
  } else if (entity.label) {
    return 'label';
  } else if (entity.cylinder) {
    return 'cylinder';
  } else if (entity.box) {
    return 'box';
  } else if (entity.ellipsoid) {
    return 'ellipsoid';
  } else if (entity.wall) {
    return 'wall';
  } else {
    return 'other';
  }
}

/**
 * 获取裁切多边形内的所有实体
 * @param {Cartesian3[]} polygon - 裁切多边形顶点数组
 * @returns {Array} 裁切多边形内的实体数组
 */
export function getEntitiesInClippingArea(polygon) {
  return safeCesiumOperation((viewer) => {
    const entities = [];
    // 1. 筛选viewer.entities中的实体
    viewer.entities.values.forEach(entity => {
      if (isEntityInPolygon(entity, polygon, viewer)) {
        entities.push({
          entity,
          source: 'viewer',
          type: getEntityType(entity)
        });
      }
    });

    // 2. 筛选所有GeoJsonDataSource中的实体
    viewer.dataSources._dataSources.forEach(dataSource => {
      if (dataSource.entities) {
        dataSource.entities.values.forEach(entity => {
          if (isEntityInPolygon(entity, polygon, viewer)) {
            entities.push({
              entity,
              source: 'geojson',
              dataSourceName: dataSource.name,
              type: getEntityType(entity)
            });
          }
        });
      }
    });

    return entities;
  }, '获取裁切区域内实体失败');
}

/**
 * 统计裁切区域内实体的数量和类型
 * @param {Cartesian3[]} polygon - 裁切多边形顶点数组
 * @returns {Object} 统计信息对象
 */
export function getEntityStatistics(polygon) {
  const entities = getEntitiesInClippingArea(polygon);

  const stats = {
    total: entities.length,
    byType: {},
    bySource: {
      viewer: 0,
      geojson: 0,
    },
    dataSources: new Set()
  };

  entities.forEach(item => {
    // 按类型统计
    const type = item.type;
    stats.byType[type] = (stats.byType[type] || 0) + 1;

    // 按数据源统计
    stats.bySource[item.source]++;

    // 记录数据源名称
    if (item.dataSourceName) {
      stats.dataSources.add(item.dataSourceName);
    }
  });

  // 转换Set为数组
  stats.dataSources = Array.from(stats.dataSources);

  return stats;
}

/**
 * 获取实体的基本信息
 * @param {Object} entity - Cesium实体
 * @param {Object} viewer - Cesium viewer实例
 * @returns {Object} 实体信息对象
 */
export function getEntityInfo(entity, viewer) {
  const position = getEntityPosition(entity, viewer);
  let coordinates = null;
  let height = null;

  if (position) {
    const cartographic = Cartographic.fromCartesian(position);
    coordinates = {
      longitude: CesiumMath.toDegrees(cartographic.longitude),
      latitude: CesiumMath.toDegrees(cartographic.latitude)
    };
    height = cartographic.height;
  }

  // 获取实体名称或ID
  let name = entity.name || entity.id || '未命名实体';
  if (typeof name === 'function') {
    try {
      name = name.getValue(viewer.clock.currentTime);
    } catch (e) {
      name = '动态名称实体';
    }
  }

  // 获取实体描述
  let description = null;
  if (entity.description) {
    try {
      if (typeof entity.description.getValue === 'function') {
        description = entity.description.getValue(viewer.clock.currentTime);
      } else {
        description = entity.description;
      }
    } catch (e) {
      // 忽略错误
    }
  }

  return {
    id: entity.id,
    name,
    type: getEntityType(entity),
    coordinates,
    height,
    description,
    hasPosition: !!position
  };
}

/**
 * 批量获取实体信息
 * @param {Array} entities - 实体数组（来自getEntitiesInClippingArea的结果）
 * @returns {Array} 实体信息数组
 */
export function getEntitiesInfo(entities) {
  return safeCesiumOperation((viewer) => {
    return entities.map(item => ({
      ...getEntityInfo(item.entity, viewer),
      source: item.source,
      dataSourceName: item.dataSourceName
    }));
  }, '获取实体信息失败');
}

/**
 * 过滤特定类型的实体
 * @param {Array} entities - 实体数组
 * @param {string|string[]} types - 要过滤的类型或类型数组
 * @returns {Array} 过滤后的实体数组
 */
export function filterEntitiesByType(entities, types) {
  const typeSet = isArray(types) ? new Set(types) : new Set([types]);

  return entities.filter(item => {
    const entityType = getEntityType(item.entity);
    return typeSet.has(entityType);
  });
}

/**
 * 检查实体是否可以被调整高度
 * @param {Object} entity - Cesium实体
 * @returns {boolean} 是否可调整高度
 */
export function isEntityHeightAdjustable(entity) {
  const type = getEntityType(entity);

  // 支持调整高度的实体类型
  const adjustableTypes = new Set([
    'point', 'model', 'label', 'cylinder', 'box', 'ellipsoid'
  ]);

  // 线、面和墙体实体需要特殊处理
  if (type === 'line' || type === 'polygon' || type === 'wall') {
    return entity.position !== undefined;
  }

  return adjustableTypes.has(type);
}
