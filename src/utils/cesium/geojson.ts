declare const Cesium: any

import { unref, toRaw, watch } from 'vue'
import {
  GeoJsonDataSource,
  PolylineArrowMaterialProperty,
  Color as CesiumColor,
  Cartesian2,
  Cartesian3,
  VerticalOrigin,
  HorizontalOrigin,
  PolylineVolumeGraphics,
  CornerType,
  Math as CesiumMath,
  CylinderGraphics,
} from 'cesium'

import { getDevicePoint, getTunnelLineString } from '../mqtt/publish'

import { turfPolygon, densifyPolygon, turfConvex, turfUnion } from '../turf'

import { setupClustering, createIconMarker, getPolylineGeometricCenter } from './index'

import { getLabelConfig, LABEL_PRESETS } from './labelConfig'

import { useGroupCompanyLevelMine } from '@/hooks/useGroupCompanyLevelMine'

// 使用辅助函数
import { getViewer, safeCesiumOperation, clearEntityArray } from './helpers'

const { getTunnelGeoJSON, getDevicePointGeoJSON } = useGroupCompanyLevelMine()

// 用 Map 管理每个 key 的 stop handle
const watchStops = new Map()
const labelMap = new Map()
const verticalShafts: any[] = []

/**
 * 清除指定名称的数据源和相关实体
 * @param {string} name - 数据源名称
 * @returns {void}
 */
function clearDataSource(name) {
  safeCesiumOperation((viewer) => {
    // 移除数据源
    const dataSources = viewer.dataSources._dataSources.filter(
      (dataSource) => dataSource.name === name,
    )
    dataSources.forEach((data) => {
      viewer.dataSources.remove(data)
    })

    // 如果是隧道数据，清除立井实体
    if (name.includes('tunnel')) {
      clearEntityArray(verticalShafts)
    }

    // 清除相关标签
    const labels = labelMap.get(name)
    if (labels) {
      labels.forEach((label) => {
        viewer.entities.remove(label)
      })
      labelMap.delete(name)
    }
  }, `清除数据源 ${name} 失败`)
}

/**
 * 加载GeoJSON点数据到Cesium场景中
 * @param {Object} geojson - GeoJSON格式的点数据
 * @param {string} name - 数据源名称
 * @param {Object} options - 加载选项配置对象
 * @param {Function} callback - 回调函数（可选）
 * @returns {void}
 *
 * @example
 * // 使用示例
 * const geojson = {
 *   type: 'FeatureCollection',
 *   features: [...]
 * };
 * geoJSONPointLoad(geojson, '设备点', { isSetupClustering: true });
 */
export function geoJSONPointLoad(geojson, name, options: any = {}, callback: any = null) {
  safeCesiumOperation((viewer) => {
    GeoJsonDataSource.load(geojson, options)
      .then((data) => {
        data.name = name
        return viewer.dataSources.add(data)
      })
      .then((dataSource) => {
        console.log('geoJSONPointLoad: ', geojson)
        const { isSetupClustering } = options
        if (isSetupClustering) {
          setupClustering(dataSource)
        }

        // 为每个点创建图标标记
        dataSource.entities.values.forEach((point) => {
          createIconMarker(point, name)
        })

        if (typeof callback === 'function') {
          callback(null, dataSource)
        }
      })
      .catch((error) => {
        console.error('Error loading GeoJSON point data:', error)
        if (typeof callback === 'function') {
          callback(error)
        }
      })
  }, `加载GeoJSON点数据 ${name} 失败`)
}

function computeCircle(radius) {
  const positions: any[] = []
  for (let i = 0; i < 360; i++) {
    const radians = CesiumMath.toRadians(i)
    positions.push(new Cesium.Cartesian2(radius * Math.cos(radians), radius * Math.sin(radians)))
  }
  return positions
}

// 巷道网络几何归一化参数
/** 端点吸附容差（米）：小于该距离的端点视为同一节点 */
const TUNNEL_SNAP_METERS = 5
/** 拐角圆角半径（米），会按相邻段长度自动收缩 */
const TUNNEL_FILLET_METERS = 6
/** 转角小于该角度不做圆角（接近直线） */
const TUNNEL_FILLET_MIN_DEG = 8

interface TunnelNode {
  lon: number
  lat: number
  segments: number[]
}

interface TunnelSegment {
  coords: number[][]
  props: any
  style: string
  start: TunnelNode
  end: TunnelNode
  used: boolean
}

/** 经纬度近似换算为米（局部小范围足够） */
function metersBetween(lon1, lat1, lon2, lat2) {
  const kx = 111320 * Math.cos((lat1 * Math.PI) / 180)
  return Math.hypot((lon2 - lon1) * kx, (lat2 - lat1) * 111320)
}

/** 巷道样式标识：样式不同的线段不能合并 */
function tunnelStyleKey(props) {
  if (!props) return ''
  return `${props.color ?? ''}|${props.width ?? ''}|${props.tunnelType ?? ''}`
}

/**
 * 在拐点处插入圆角（二次贝塞尔近似），消除硬折角
 * @param {number[][]} coords - 坐标数组 [lon, lat, height?]
 * @param {number} radiusMeters - 圆角半径（米）
 * @returns {number[][]} 圆角化后的坐标
 */
function filletTunnelPath(coords, radiusMeters) {
  if (coords.length < 3) return coords
  const out = [coords[0]]
  let lastHeight = coords[0][2] ?? 0
  for (let i = 1; i < coords.length - 1; i++) {
    const p0 = coords[i - 1]
    const p1 = coords[i]
    const p2 = coords[i + 1]
    const height = p1[2] ?? lastHeight
    lastHeight = height
    const kx = 111320 * Math.cos((p1[1] * Math.PI) / 180)
    const v1x = (p0[0] - p1[0]) * kx
    const v1y = (p0[1] - p1[1]) * 111320
    const v2x = (p2[0] - p1[0]) * kx
    const v2y = (p2[1] - p1[1]) * 111320
    const l1 = Math.hypot(v1x, v1y)
    const l2 = Math.hypot(v2x, v2y)
    if (!l1 || !l2) {
      out.push(p1)
      continue
    }
    const cos = Math.min(1, Math.max(-1, (v1x * v2x + v1y * v2y) / (l1 * l2)))
    const turn = Math.acos(cos)
    if (turn < (TUNNEL_FILLET_MIN_DEG * Math.PI) / 180) {
      out.push(p1)
      continue
    }
    const r = Math.min(radiusMeters, l1 * 0.45, l2 * 0.45)
    const ax = p1[0] + ((v1x / l1) * r) / kx
    const ay = p1[1] + ((v1y / l1) * r) / 111320
    const bx = p1[0] + ((v2x / l2) * r) / kx
    const by = p1[1] + ((v2y / l2) * r) / 111320
    out.push([ax, ay, height])
    for (let k = 1; k <= 4; k++) {
      const t = k / 5
      const mt = 1 - t
      out.push([
        mt * mt * ax + 2 * mt * t * p1[0] + t * t * bx,
        mt * mt * ay + 2 * mt * t * p1[1] + t * t * by,
        height,
      ])
    }
    out.push([bx, by, height])
  }
  out.push(coords[coords.length - 1])
  return out
}

/**
 * 巷道网络几何归一化
 *
 * 源数据把一条巷道拆成多个独立线段，相接处端点常有几米错位、拐角是硬折点，
 * 直接逐段画体积会出现错台和断口。这里做三件事：
 * 1. 端点吸附：容差内的端点统一成同一坐标，消除错台；
 * 2. 链合并：仅两段相接且样式一致的节点合并成一条连续折线，节点处不再有封盖；
 * 3. 拐角圆角：按相邻段长度自适应插入圆角点。
 * 三通及以上的真实分叉保持独立（端点已吸附，封盖完全重合）。
 * @param {Object} geojson - 原始巷道线 GeoJSON
 * @returns {Object} 归一化后的 GeoJSON
 */
function prepareTunnelGeoJSON(geojson) {
  const features = geojson?.features
  if (!Array.isArray(features) || !features.length) return geojson

  const others: any[] = []
  const segments: TunnelSegment[] = []
  features.forEach((feature) => {
    const geometry = feature?.geometry
    if (geometry?.type === 'LineString' && geometry.coordinates?.length >= 2) {
      segments.push({
        coords: geometry.coordinates.map((c) => c.slice()),
        props: feature.properties || {},
        style: tunnelStyleKey(feature.properties),
        start: null as unknown as TunnelNode,
        end: null as unknown as TunnelNode,
        used: false,
      })
    } else {
      others.push(feature)
    }
  })
  if (!segments.length) return geojson

  // 端点吸附
  const grid = new Map<string, TunnelNode[]>()
  const cell = 4 // 米
  const getNode = (lon: number, lat: number): TunnelNode => {
    const qx = Math.round((lon * 111320 * Math.cos((lat * Math.PI) / 180)) / cell)
    const qy = Math.round((lat * 111320) / cell)
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const list = grid.get(`${qx + dx},${qy + dy}`)
        if (!list) continue
        for (const node of list) {
          if (metersBetween(node.lon, node.lat, lon, lat) <= TUNNEL_SNAP_METERS) return node
        }
      }
    }
    const node: TunnelNode = { lon, lat, segments: [] }
    const key = `${qx},${qy}`
    const bucket = grid.get(key)
    if (bucket) bucket.push(node)
    else grid.set(key, [node])
    return node
  }

  segments.forEach((seg, index) => {
    const first = seg.coords[0]
    const last = seg.coords[seg.coords.length - 1]
    seg.start = getNode(first[0], first[1])
    seg.end = getNode(last[0], last[1])
    seg.start.segments.push(index)
    seg.end.segments.push(index)
    // 吸附到公共坐标，保留各自高程
    first[0] = seg.start.lon
    first[1] = seg.start.lat
    last[0] = seg.end.lon
    last[1] = seg.end.lat
  })

  // 链合并：只在“恰好两段相接且样式一致”的节点穿过，其余节点保持独立
  const merged = reconstructChains(segments, tunnelStyleKey)
  const result = merged.map((chain) => ({
    type: 'Feature',
    properties: chain.props,
    geometry: {
      type: 'LineString',
      coordinates: filletTunnelPath(chain.coords, TUNNEL_FILLET_METERS),
    },
  }))
  return { ...geojson, features: [...result, ...others] }
}

/**
 * 按端点图重建连续链
 * @param {Object[]} segments - 线段集合（已含 start/end 节点）
 * @returns {Object[]} 合并后的链
 */
function reconstructChains(
  segments: TunnelSegment[],
  styleKeyOf: (props: any) => string,
): { coords: number[][]; props: any }[] {
  segments.forEach((s) => (s.used = false))
  const chains: { coords: number[][]; props: any }[] = []
  for (let i = 0; i < segments.length; i++) {
    if (segments[i].used) continue
    const root = segments[i]
    root.used = true
    let coords = root.coords.slice()

    const extend = (node, prepend) => {
      let current = node
      for (;;) {
        if (current.segments.length !== 2) break
        const nextIndex = current.segments.find((idx) => !segments[idx].used)
        if (nextIndex === undefined) break
        const next = segments[nextIndex]
        if (styleKeyOf(next.props) !== styleKeyOf(root.props)) break
        next.used = true
        const forward = next.start === current
        const rest = forward ? next.coords.slice(1) : next.coords.slice(0, -1).reverse()
        coords = prepend ? rest.concat(coords) : coords.concat(rest)
        current = forward ? next.end : next.start
      }
      return current
    }

    extend(root.end, false)
    extend(root.start, true)
    chains.push({ coords, props: root.props })
  }
  return chains
}

/**
 * 加载GeoJSON线字符串数据并渲染到Cesium场景中
 * 支持隧道线和立井的特殊处理
 * @param {Object} geojson - GeoJSON格式的线字符串数据
 * @param {string} name - 数据源名称
 * @param {Object} options - 加载选项配置对象
 * @param {Function} callback - 回调函数（可选）
 * @returns {void}
 *
 * @example
 * // 使用示例
 * const geojson = {
 *   type: 'FeatureCollection',
 *   features: [...]
 * };
 * geoJSONLineStringLoad(geojson, '隧道线', {}, (err, dataSource) => {
 *   if (!err) console.log('隧道线加载成功');
 * });
 */
export function geoJSONLineStringLoad(geojson, name, options: any = {}, callback: any = null) {
  // 验证必要参数
  if (!geojson || !name) {
    const error = new Error('geoJSONLineStringLoad: geojson and name are required')
    console.error(error.message)
    if (typeof callback === 'function') {
      callback(error)
    }
    return
  }

  safeCesiumOperation((viewer) => {
    // 先做端点吸附/链合并/圆角，消除相接错台与硬折角，再交给 Cesium 渲染
    GeoJsonDataSource.load(prepareTunnelGeoJSON(geojson), options)
      .then((data) => {
        data.name = name
        return viewer.dataSources.add(data)
      })
      .then((dataSource) => {
        if (!dataSource || !dataSource.entities) {
          throw new Error('Data source or entities not available')
        }

        // 处理每条线实体
        dataSource.entities.values.forEach((line) => {
          processLineEntity(line, name, viewer)
        })

        if (typeof callback === 'function') {
          callback(null, dataSource)
        }
      })
      .catch((error) => {
        console.error('Error loading GeoJSON line data:', error)
        if (typeof callback === 'function') {
          callback(error)
        }
      })
  }, `加载GeoJSON线数据 ${name} 失败`)
}

/**
 * 处理线实体
 * 根据隧道类型设置不同的可视化效果
 * @param {Object} line - 线实体对象
 * @param {string} name - 数据源名称
 * @param {Object} viewer - Cesium viewer 实例
 * @returns {void}
 */
function processLineEntity(line, name, viewer) {
  try {
    // 验证line对象和必要属性
    if (!line || !line.properties || typeof line.properties.getValue !== 'function') {
      console.warn('Invalid line entity:', line)
      return
    }

    const properties = line.properties.getValue()
    if (!properties) {
      console.warn('No properties found for line:', line)
      return
    }

    const { color, width, tunnelName, tunnelType } = properties

    // 验证必要属性
    if (!color) {
      console.warn('Missing color property for line:', line)
      return
    }

    // 验证polyline存在
    if (!line.polyline || typeof line.polyline.positions?.getValue !== 'function') {
      console.warn('Invalid polyline for line:', line)
      return
    }

    const positions = line.polyline.positions.getValue()

    // 验证positions数组
    if (!Array.isArray(positions) || positions.length < 2) {
      console.warn('Insufficient positions for line:', line)
      return
    }

    const _color = CesiumColor.fromCssColorString(color)

    // 设置线颜色
    setLineColor(line)

    // 设置线名称标签
    setLineName(name, { positions, tunnelName })

    // 根据隧道类型处理特殊效果
    if ([1, 2, 15].includes(tunnelType)) {
      // 立井：创建圆柱体表示
      createVerticalShaft(positions, _color, tunnelName, viewer)
    } else {
      // 普通隧道：创建多边形体积
      createTunnelVolume(line, positions, _color)
    }
  } catch (error: any) {
    console.error('Error processing line entity:', line, error)
  }
}
/**
 * 设置线颜色和宽度
 * @param {Object} line - 线实体对象
 * @returns {void}
 */
function setLineColor(line) {
  const { color, width } = line.properties.getValue()
  const _color = CesiumColor.fromCssColorString(color)
  line.polyline.material = new PolylineArrowMaterialProperty(_color)
  line.polyline.width = width ?? 12
}

/**
 * 设置线名称并在线的几何中心位置添加高度标签
 * @param {string} name - 数据源名称
 * @param {Object} lineData - 包含位置和隧道名称的线数据
 * @returns {void}
 */
function setLineName(name, lineData) {
  const { positions, tunnelName } = lineData
  if (!tunnelName) return

  safeCesiumOperation((viewer) => {
    const position = getPolylineGeometricCenter(positions)
    const label = viewer.entities.add({
      position: position,
      label: {
        text: tunnelName,
        verticalOrigin: VerticalOrigin.CENTER,
        horizontalOrigin: HorizontalOrigin.CENTER,
        eyeOffset: new Cartesian3(0, 0, -40),
        ...getLabelConfig(LABEL_PRESETS.NORMAL),
      },
    })

    // 保存标签引用以便后续清理
    const labels = labelMap.get(name) || []
    labels.push(label)
    labelMap.set(name, labels)
  }, `设置线 ${tunnelName} 标签失败`)
}

/**
 * 创建立井圆柱体
 * @param {Array<Cartesian3>} positions - 线位置数组
 * @param {Object} color - Cesium颜色对象
 * @param {string} tunnelName - 隧道名称
 * @param {Object} viewer - Cesium viewer 实例
 * @returns {void}
 */
function createVerticalShaft(positions, color, tunnelName, viewer) {
  console.log('立井: ', tunnelName)

  const length = Cartesian3.distance(positions[1], positions[0])
  const center = Cartesian3.midpoint(positions[1], positions[0], new Cartesian3())

  const shaft = viewer.entities.add({
    position: center,
    cylinder: {
      length,
      topRadius: 3,
      bottomRadius: 3,
      material: color.withAlpha(0.5),
      // 与巷道体积保持一致：描边会在与巷道相接处画出断口
      outline: false,
    },
  })

  verticalShafts.push(shaft)
  console.log('已新增立井 shaft: ', tunnelName, shaft)
}

/**
 * 创建隧道多边形体积
 * @param {Object} line - 线实体对象
 * @param {Array<Cartesian3>} positions - 线位置数组
 * @param {Object} color - Cesium颜色对象
 * @returns {void}
 */
function createTunnelVolume(line, positions, color) {
  line.polylineVolume = new PolylineVolumeGraphics({
    positions,
    shape: [
      new Cartesian2(-3, -3),
      new Cartesian2(3, -3),
      new Cartesian2(3, 3),
      new Cartesian2(-3, 3),
    ],
    // 圆角折线比斜角折线过渡自然，配合更细的粒度让弯道不再呈硬折面
    cornerType: CornerType.ROUNDED,
    granularity: CesiumMath.toRadians(0.2),
    material: color.withAlpha(0.5),
    // 描边是按线段绘制的，每个相接节点的轮廓都会形成断口；去掉后相邻巷道视觉上连成一体
    outline: false,
  })
}

let stopPointWatch

/**
 * 加载矿山设备点数据
 * @param {Object} mine - 矿山对象，包含矿山相关信息
 * @param {string} key - 数据源标识key
 * @param {boolean} is - 是否执行加载操作的开关标志
 * @returns {void}
 */
export function loadMineDevicePoint(mine, key, is) {
  clearDataSource(key)
  if (watchStops.has(key)) {
    watchStops.get(key)()
    watchStops.delete(key)
  }
  if (!is) {
    return
  }
  const { name } = mine
  getDevicePoint(name)
  if (stopPointWatch) stopPointWatch()
  const stop = watch(
    () => unref(getDevicePointGeoJSON),
    (newVal) => {
      console.log('loadMineDevicePoint: ', key, newVal)
      geoJSONPointLoad(newVal, key)
    },
  )
  watchStops.set(key, stop)
}

let stopLineWatch
/**
 * 加载矿山隧道数据
 * @param {Object} mine - 矿山对象，包含矿山相关信息
 * @param {string} key - 数据标识键值
 * @param {boolean} is - 是否执行加载操作的开关标志
 * @returns {void}
 */
export function loadMineTunnel(mine, key, is) {
  clearDataSource(key)
  if (watchStops.has(key)) {
    watchStops.get(key)()
    watchStops.delete(key)
  }
  if (!is) {
    return
  }
  const { name } = mine
  getTunnelLineString(name)
  const stop = watch(
    () => unref(getTunnelGeoJSON),
    (newVal) => {
      console.log('getTunnelGeoJSON: ', newVal, key)
      geoJSONLineStringLoad(newVal, key)
    },
  )
  watchStops.set(key, stop)
}
