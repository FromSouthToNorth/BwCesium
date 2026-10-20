import {
  point as Point,
  polygon as Polygon,
  bbox,
  booleanEqual as turfBooleanEqual,
  buffer,
  transformScale,
  bboxPolygon,
  centroid,
  bearing,
  concave,
  convex,
  explode,
  union,
  featureCollection,
  multiPolygon,
} from '@turf/turf'
import { isArray, isObject } from '../is'

/**
 * 为 GeoJSON 对象设置 ID（如果源对象有 ID）
 * @param {Object} item - 源对象
 * @param {Object} geo - 目标 GeoJSON 对象
 * @returns {void}
 * @private
 */
function setId(item, geo) {
  const { id } = item
  if (id) geo.id = id
}

/**
 * 合并两个多边形
 * @param {Feature<Polygon>} poly1 - 第一个多边形
 * @param {Feature<Polygon>} poly2 - 第二个多边形
 * @returns {Feature<Polygon>} 合并结果
 */
export function turfUnion(poly1, poly2) {
  return union(featureCollection([poly1, poly2]));
}

/**
 * 根据点集生成凹包（凹形轮廓）
 * @param {FeatureCollection<Point>} geojsonPoints - 点的要素集合
 * @returns {Feature<Polygon>} 凹包多边形
 */
export function turfConcave(geojsonPoints) {
  return concave(geojsonPoints)
}

/**
 * 根据点集生成凸包（凸形轮廓）
 * @param {FeatureCollection<Point>} geojson - 点的要素集合
 * @returns {Feature<Polygon>} 凸包多边形
 */
export function turfConvex(geojson) {
  return convex(geojson);
}

/**
 * 计算 GeoJSON 对象的中心点
 * @param {GeoJSON} geojson - 输入的 GeoJSON 对象
 * @returns {number[]} [lng, lat] 坐标对
 */
export function turfCentroid(geojson) {
  return centroid(geojson).geometry.coordinates;
}

/**
 * 在每条边上均匀插入指定数量的点，增加多边形分辨率（不改变形状）
 * @param {Feature<Polygon|MultiPolygon>} polygon - Polygon 或 MultiPolygon Feature
 * @param {number} [pointsPerEdge=5] - 每条边插入的点数（不含原有端点）
 * @returns {Feature<Polygon|MultiPolygon>} 点密化后的多边形
 */
export function densifyPolygon(polygon, pointsPerEdge = 5) {
  // 密化单条环的内部函数
  const densifyRing = (ring) => {
    if (!isArray(ring) || ring.length === 0) return ring

    // 判断环是否闭合（首尾坐标相同）
    const closed = (r) => {
      const a = r[0]
      const b = r[r.length - 1]
      return isArray(a) && isArray(b) && a[0] === b[0] && a[1] === b[1]
    }

    // 确保环闭合，如未闭合则在末尾添加首坐标
    const ensureClosed = (r) => (closed(r) ? r.slice() : r.concat([r[0]]))

    const src = ensureClosed(ring)
    const out: any[] = []
    // 逐条边处理，在相邻点之间插入均匀分布的新点
    for (let i = 0; i < src.length - 1; i++) {
      const start = src[i]
      const end = src[i + 1]
      out.push(start)
      // 使用线性插值在起点和终点之间插入新点
      for (let j = 1; j <= pointsPerEdge; j++) {
        const t = j / (pointsPerEdge + 1)
        out.push([start[0] + (end[0] - start[0]) * t, start[1] + (end[1] - start[1]) * t])
      }
    }
    out.push(src[src.length - 1])  // 完成闭合
    return out
  }

  const props = polygon.properties || {}
  const coords = polygon.geometry ? polygon.geometry.coordinates : polygon.coordinates
  if (!coords) return polygon

  // 判断是 Polygon 还是 MultiPolygon：MultiPolygon 的坐标是 4 层嵌套数组
  const isMulti = isArray(coords[0]) && isArray(coords[0][0]) && isArray(coords[0][0][0])

  if (isMulti) {
    // MultiPolygon：对每个 Polygon 的每个环分别密化
    const newCoords = coords.map((poly) => poly.map(densifyRing))
    return multiPolygon(newCoords, props)
  }

  // Polygon：对每个环分别密化
  const newCoords = coords.map(densifyRing)
  return Polygon(newCoords, props)
}

/**
 * 从中心点缩放 GeoJSON 对象
 * @param {GeoJSON} geojson - 输入的 GeoJSON 对象
 * @param {number} factor - 缩放系数（>1 放大，<1 缩小）
 * @returns {GeoJSON} 缩放后的 GeoJSON 对象
 */
export function turfTransformScale(geojson, factor) {
  return transformScale(geojson, factor)
}

/**
 * 创建 Polygon 或 MultiPolygon Feature
 * @param {Object} item - 源对象或坐标对象，应包含 coordinates 或 geometry.coordinates
 * @returns {Feature<Polygon|MultiPolygon>} 创建的多边形 Feature
 */
export function turfPolygon(item) {
  const coordinates = item.coordinates || (item.geometry && item.geometry.coordinates)
  const properties = { ...item }
  // 判断坐标结构是否为 MultiPolygon（4層嵌套数组）
  if (isArray(coordinates) && isArray(coordinates[0]) && isArray(coordinates[0][0]) && isArray(coordinates[0][0][0])) {
    const poly = multiPolygon(coordinates, properties)
    setId(item, poly)
    return poly
  }
  // 否则作为 Polygon（3層嵌套数组）
  const poly = Polygon(coordinates, properties)
  setId(item, poly)
  return poly
}

/**
 * 创建 Point Feature（支持 2D 或 3D 坐标）
 * @param {number[]|Object} item - 点对象：[lng, lat] / [lng, lat, z] 或 {lng, lat, ...} 等
 * @returns {Feature<Point>} 创建的点 Feature
 */
export function turfPoint(item) {
  // 支持数组格式和对象格式的经纬度属性
  const lng = isArray(item) ? item[0] : (item.L ?? item.lng ?? item.lon ?? item.longitude)
  const lat = isArray(item) ? item[1] : (item.B ?? item.lat ?? item.latitude)
  const z = isArray(item) ? item[2] : (item.z ?? item.Z)
  // 如果有 boundary，将其转换为多边形并附加到对象
  if (isArray(item.boundary) && item.boundary.length) {
    item.boundaryGeo = turfPolygon({ coordinates: item.boundary, ...item })
  }
  // 过滤掉 undefined 的坐标值（只包括有效的坐标）
  const point = Point([lng, lat, z].filter((v) => v !== undefined), { ...item })
  setId(item, point)
  return point
}

/**
 * 创建要素集合（FeatureCollection）
 * @param {Array|Object} items - 要素数组或对象
 * @returns {import('geojson').FeatureCollection} 要素集合
 */
export function turfFeatureCollection(items) {
  if (isArray(items)) {
    // 如果已是 Feature/FeatureCollection，直接使用；否则尝试转为 Point
    if (items.length > 0 && items[0].type && (items[0].type === 'Feature' || items[0].type === 'FeatureCollection')) {
      return featureCollection(items)
    }
    return featureCollection(items.map((it) => (it && it.type ? it : turfPoint(it))))
  }
  if (isObject(items)) return featureCollection(items)
  return featureCollection([])
}

/**
 * 计算 GeoJSON 对象的边界框
 * @param {import('geojson').GeoJSON} items - 输入的 GeoJSON 对象
 * @returns {number[]} [minX, minY, maxX, maxY] 边界框坐标
 */
export function turfBbox(items) {
  return bbox(items)
}
