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
  } catch (error: any) {
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
  } catch (error: any) {
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
  } catch (error: any) {
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
  } catch (error: any) {
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
    const entities: any[] = [];
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

  const stats: any = {
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
