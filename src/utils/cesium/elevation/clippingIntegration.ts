import { Cartographic, Math as CesiumMath } from 'cesium'
import { getViewer } from '../helpers'

/**
 * 裁切功能集成模块
 * 提供与现有裁切功能集成的工具函数
 */

/**
 * 获取当前激活的裁切多边形位置
 * @returns {Cartesian3[]|null} 裁切多边形顶点数组，如果没有激活的裁切则返回null
 */
export function getActiveClippingPolygon() {
  // viewer 异步创建期间弹窗轮询就会来查询，此时视为无裁切，返回 null 由调用方按无裁切处理
  const viewer = getViewer()
  if (!viewer) return null

  const clippingPolygons = viewer.scene.globe.clippingPolygons
  if (!clippingPolygons || clippingPolygons.length === 0) {
    return null
  }

  // 查找第一个启用的裁切多边形
  for (let i = 0; i < clippingPolygons.length; i++) {
    const polygon = clippingPolygons.get(i)
    if (polygon && polygon.positions) {
      return polygon.positions
    }
  }

  return null
}

/**
 * 判断点是否在多边形内（射线法），支持缓冲区范围
 * 复用clipping.js中的算法，确保一致性
 * @param {Cartesian3} point - 要判断的点
 * @param {Cartesian3[]} polygon - 多边形顶点数组
 * @param {number} [bufferRadius=0.01] - 缓冲区半径（单位：千米），默认0.01千米（约10米）
 * @returns {boolean} 点是否在多边形内（包括缓冲区）
 */
export function isPointInPolygon(point, polygon, bufferRadius = 0.01) {
  if (!point || !polygon || polygon.length < 3) return false

  // 将点转换为经纬度
  const cartographic = Cartographic.fromCartesian(point)
  const pointLng = CesiumMath.toDegrees(cartographic.longitude)
  const pointLat = CesiumMath.toDegrees(cartographic.latitude)

  // 将多边形顶点转换为经纬度
  const polygonLngLat = polygon.map((pos) => {
    const carto = Cartographic.fromCartesian(pos)
    return {
      lng: CesiumMath.toDegrees(carto.longitude),
      lat: CesiumMath.toDegrees(carto.latitude),
    }
  })

  let inside = false
  const n = polygonLngLat.length

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygonLngLat[i].lng
    const yi = polygonLngLat[i].lat
    const xj = polygonLngLat[j].lng
    const yj = polygonLngLat[j].lat

    const intersect =
      yi > pointLat !== yj > pointLat && pointLng < ((xj - xi) * (pointLat - yi)) / (yj - yi) + xi

    if (intersect) inside = !inside
  }

  // 如果点在多边形内，直接返回true
  if (inside) return true

  // 如果点不在多边形内，但bufferRadius > 0，则检查点是否在缓冲区范围内
  if (bufferRadius > 0) {
    // 计算点到多边形每条边的最短距离
    let minDistance = Infinity

    for (let i = 0, j = n - 1; i < n; j = i++) {
      const xi = polygonLngLat[i].lng
      const yi = polygonLngLat[i].lat
      const xj = polygonLngLat[j].lng
      const yj = polygonLngLat[j].lat

      // 计算点到线段的最短距离
      const distance = pointToSegmentDistance(pointLng, pointLat, xi, yi, xj, yj)
      minDistance = Math.min(minDistance, distance)
    }

    // 将距离转换为千米（近似）
    const distanceKm = minDistance * 111.32 // 1度纬度约111.32公里

    // 如果距离小于缓冲区半径，则认为点在缓冲区范围内
    return distanceKm <= bufferRadius
  }

  return false
}

/**
 * 计算点到线段的最短距离
 * @param {number} px - 点的经度
 * @param {number} py - 点的纬度
 * @param {number} x1 - 线段起点经度
 * @param {number} y1 - 线段起点纬度
 * @param {number} x2 - 线段终点经度
 * @param {number} y2 - 线段终点纬度
 * @returns {number} 最短距离（度）
 */
function pointToSegmentDistance(px, py, x1, y1, x2, y2) {
  const A = px - x1
  const B = py - y1
  const C = x2 - x1
  const D = y2 - y1

  const dot = A * C + B * D
  const lenSq = C * C + D * D
  let param = -1

  if (lenSq !== 0) {
    param = dot / lenSq
  }

  let xx, yy

  if (param < 0) {
    xx = x1
    yy = y1
  } else if (param > 1) {
    xx = x2
    yy = y2
  } else {
    xx = x1 + param * C
    yy = y1 + param * D
  }

  const dx = px - xx
  const dy = py - yy

  return Math.sqrt(dx * dx + dy * dy)
}

/**
 * 获取裁切多边形的边界信息
 * @param {Cartesian3[]} polygon - 裁切多边形顶点数组
 * @returns {Object} 边界信息对象
 */
export function getClippingPolygonBounds(polygon) {
  if (!polygon || polygon.length === 0) {
    return null
  }

  let minLng = Infinity
  let maxLng = -Infinity
  let minLat = Infinity
  let maxLat = -Infinity

  polygon.forEach((position) => {
    const cartographic = Cartographic.fromCartesian(position)
    const lng = CesiumMath.toDegrees(cartographic.longitude)
    const lat = CesiumMath.toDegrees(cartographic.latitude)

    minLng = Math.min(minLng, lng)
    maxLng = Math.max(maxLng, lng)
    minLat = Math.min(minLat, lat)
    maxLat = Math.max(maxLat, lat)
  })

  return {
    west: minLng,
    east: maxLng,
    south: minLat,
    north: maxLat,
    center: {
      lng: (minLng + maxLng) / 2,
      lat: (minLat + maxLat) / 2,
    },
    width: maxLng - minLng,
    height: maxLat - minLat,
  }
}

/**
 * 计算裁切多边形的面积（近似值，单位：平方公里）
 * @param {Cartesian3[]} polygon - 裁切多边形顶点数组
 * @returns {number} 面积（平方公里）
 */
export function calculatePolygonArea(polygon) {
  if (!polygon || polygon.length < 3) return 0

  // 使用球面多边形面积近似计算
  let area = 0
  const n = polygon.length

  for (let i = 0; i < n; i++) {
    const p1 = polygon[i]
    const p2 = polygon[(i + 1) % n]

    const carto1 = Cartographic.fromCartesian(p1)
    const carto2 = Cartographic.fromCartesian(p2)

    const lat1 = CesiumMath.toDegrees(carto1.latitude)
    const lng1 = CesiumMath.toDegrees(carto1.longitude)
    const lat2 = CesiumMath.toDegrees(carto2.latitude)
    const lng2 = CesiumMath.toDegrees(carto2.longitude)

    // 简单的梯形法近似计算（对于小范围区域足够精确）
    area += ((lng2 - lng1) * (lat1 + lat2)) / 2
  }

  // 转换为平方公里（近似）
  const earthRadius = 6371 // 地球半径（公里）
  const areaKm2 = Math.abs(area) * (Math.PI / 180) * earthRadius * earthRadius

  return Math.round(areaKm2 * 100) / 100 // 保留两位小数
}

/**
 * 检查是否有激活的裁切区域
 * @returns {boolean} 是否有激活的裁切
 */
export function hasActiveClipping() {
  const polygon = getActiveClippingPolygon()
  return polygon !== null && polygon.length >= 3
}

/**
 * 获取裁切区域信息摘要
 * @returns {Object|null} 裁切区域信息，如果没有激活的裁切则返回null
 */
export function getClippingAreaInfo() {
  const polygon = getActiveClippingPolygon()
  if (!polygon) return null

  const bounds = getClippingPolygonBounds(polygon)
  const area = calculatePolygonArea(polygon)

  return {
    polygon,
    bounds,
    area,
    vertexCount: polygon.length,
    isValid: polygon.length >= 3,
  }
}
