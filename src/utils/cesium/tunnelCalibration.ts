/**
 * 巷道模型自动配准
 *
 * 模型几何来自服务端 OBJ（矿方建模坐标系），巷道线来自业务数据（经纬度 + 高程），
 * 两者采集/建模过程不同，可能存在整体航向差与高程基准差。逐矿手工标定不可维护，
 * 这里在运行时用当前矿自己的巷道线自动拟合校正量，并按 MineDesc 缓存。
 *
 * 拟合思路：
 * 1. 航向：把线点逆旋转回模型坐标系后，落进模型巷道足迹栅格的比例最高即为最佳航向；
 * 2. 高程：固定航向后，取让线点高程尽量落在模型巷道截面内的偏移量。
 */
import { Cartesian3, Matrix4, Transforms } from 'cesium'
import type { TunnelFootprint } from './objToGltf'

export interface TunnelCalibration {
  /** 绕模型原点旋转的航向角（度，Cesium 正值为逆时针） */
  heading: number
  /** 模型垂直偏移（米，正值为抬高） */
  yOffset: number
}

export interface TunnelCalibrationResult extends TunnelCalibration {
  /** 拟合后线点落在模型巷道足迹内的比例 */
  hitRate: number
  /** 相对未校正的命中率提升，用于判断是否值得应用 */
  confidence: number
}

const STORAGE_PREFIX = 'bwcesium:tunnel-calib:v2:'
/** 航向搜索范围（度）与步长 */
const HEADING_RANGE = 6
const HEADING_STEP = 0.1
/** 高程偏移搜索范围（米）与步长 */
const Y_OFFSET_RANGE = 80
const Y_OFFSET_STEP = 2
/** 参与拟合的最大采样点数 */
const MAX_SAMPLE_POINTS = 1500
/** 有效线点下限 */
const MIN_SAMPLE_POINTS = 60
/** 航向命中率提升低于该值时不旋转（避免噪声导致误校正） */
const MIN_CONFIDENCE = 0.05

/**
 * 读取该矿已缓存的配准结果
 * @param {string} mineDesc - 矿井代号
 * @returns {TunnelCalibration|null} 配准结果
 */
export function loadCachedCalibration(mineDesc: string): TunnelCalibration | null {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + mineDesc)
    if (!raw) return null
    const value = JSON.parse(raw)
    if (typeof value?.heading === 'number' && typeof value?.yOffset === 'number') {
      return { heading: value.heading, yOffset: value.yOffset }
    }
  } catch {
    /* 缓存不可用不影响加载 */
  }
  return null
}

/**
 * 缓存该矿的配准结果
 * @param {string} mineDesc - 矿井代号
 * @param {TunnelCalibration} calibration - 配准结果
 * @returns {void}
 */
export function saveCachedCalibration(mineDesc: string, calibration: TunnelCalibration): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + mineDesc, JSON.stringify(calibration))
  } catch {
    /* 缓存不可用不影响加载 */
  }
}

interface LocalPoint {
  east: number
  north: number
  up: number
}

/**
 * 把巷道线 GeoJSON 转成相对矿井锚点的本地坐标（东/北/高程，单位米）
 * @param {Object} geojson - 巷道线 GeoJSON
 * @param {Object} mine - 矿井对象（含 L/B/z）
 * @returns {LocalPoint[]} 本地坐标点
 */
function collectLinePoints(geojson, mine): LocalPoint[] {
  const enu = Transforms.eastNorthUpToFixedFrame(Cartesian3.fromDegrees(mine.L, mine.B, mine.z))
  const inverse = Matrix4.inverse(enu, new Matrix4())
  const points: LocalPoint[] = []
  const local = new Cartesian3()

  const pushCoord = (coord: unknown) => {
    if (!Array.isArray(coord) || coord.length < 2) return
    const lon = Number(coord[0])
    const lat = Number(coord[1])
    const height = Number(coord[2])
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) return
    const cartesian = Cartesian3.fromDegrees(lon, lat, Number.isFinite(height) ? height : mine.z)
    Matrix4.multiplyByPoint(inverse, cartesian, local)
    points.push({ east: local.x, north: local.y, up: local.z })
  }

  const walk = (node: any) => {
    if (!node) return
    if (node.type === 'FeatureCollection') {
      node.features?.forEach(walk)
    } else if (node.type === 'Feature') {
      walk(node.geometry)
    } else if (node.type === 'LineString') {
      node.coordinates?.forEach(pushCoord)
    } else if (node.type === 'MultiLineString') {
      node.coordinates?.forEach((line: unknown[]) => line.forEach(pushCoord))
    } else if (node.type === 'Polygon' || node.type === 'MultiPolygon') {
      // 兜底：个别数据用面表示巷道
      const rings = node.type === 'Polygon' ? node.coordinates : node.coordinates?.flat()
      rings?.forEach((ring: unknown[]) => ring.forEach(pushCoord))
    }
  }
  walk(geojson)
  return points
}

/**
 * 线点按模型航向逆旋转后落进足迹栅格
 * @param {LocalPoint[]} points - 本地坐标点
 * @param {TunnelFootprint} fp - 足迹栅格
 * @param {number} headingDeg - 待评估的模型航向（度）
 * @returns {{ covered: number; hit: number }} 有效点数与命中数
 */
function countHits(points: LocalPoint[], fp: TunnelFootprint, headingDeg: number) {
  const rad = (headingDeg * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  let covered = 0
  let hit = 0
  for (const p of points) {
    // 模型按 heading 旋转，等价于把线点按 -heading 转回模型坐标系
    const east = p.east * cos + p.north * sin
    const north = -p.east * sin + p.north * cos
    const ix = Math.floor((east - fp.minX) / fp.cellSize)
    const iz = Math.floor((-north - fp.minZ) / fp.cellSize)
    if (ix < 0 || ix >= fp.cols || iz < 0 || iz >= fp.rows) continue
    covered++
    if (fp.occ[iz * fp.cols + ix]) hit++
  }
  return { covered, hit }
}

/**
 * 在给定航向下评估高程偏移的越界量
 * @param {LocalPoint[]} points - 本地坐标点
 * @param {TunnelFootprint} fp - 足迹栅格
 * @param {number} headingDeg - 模型航向（度）
 * @param {number} yOffset - 模型垂直偏移（米）
 * @returns {{ samples: number; overflow: number }} 命中格数与总越界量（米）
 */
function measureYOverflow(
  points: LocalPoint[],
  fp: TunnelFootprint,
  headingDeg: number,
  yOffset: number,
) {
  const rad = (headingDeg * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  let samples = 0
  let overflow = 0
  for (const p of points) {
    const east = p.east * cos + p.north * sin
    const north = -p.east * sin + p.north * cos
    const ix = Math.floor((east - fp.minX) / fp.cellSize)
    const iz = Math.floor((-north - fp.minZ) / fp.cellSize)
    if (ix < 0 || ix >= fp.cols || iz < 0 || iz >= fp.rows) continue
    const idx = iz * fp.cols + ix
    if (!fp.occ[idx]) continue
    samples++
    const low = fp.yMin[idx] / 10 + fp.yBase
    const high = fp.yMax[idx] / 10 + fp.yBase
    // 模型抬高 yOffset 后，线点相对模型的高程相应降低
    const y = p.up - yOffset
    if (y < low) overflow += low - y
    else if (y > high) overflow += y - high
  }
  return { samples, overflow }
}

/**
 * 用当前矿的巷道线自动拟合模型配准参数
 * @param {Object} geojson - 巷道线 GeoJSON
 * @param {TunnelFootprint} footprint - 模型水平足迹
 * @param {Object} mine - 矿井对象（含 L/B/z）
 * @returns {TunnelCalibrationResult|null} 拟合结果，数据不足时返回 null
 */
export function fitTunnelCalibration(
  geojson,
  footprint: TunnelFootprint,
  mine,
): TunnelCalibrationResult | null {
  const all = collectLinePoints(geojson, mine)
  if (all.length < MIN_SAMPLE_POINTS) return null

  // 均匀抽稀，控制拟合耗时
  const step = Math.max(1, Math.ceil(all.length / MAX_SAMPLE_POINTS))
  const points = all.filter((_, i) => i % step === 0)

  const base = countHits(points, footprint, 0)
  if (base.covered < MIN_SAMPLE_POINTS) return null
  const baseRate = base.hit / base.covered

  let bestHeading = 0
  let bestScore = -Infinity
  for (let h = -HEADING_RANGE; h <= HEADING_RANGE + 1e-9; h += HEADING_STEP) {
    const { covered, hit } = countHits(points, footprint, h)
    if (covered < MIN_SAMPLE_POINTS) continue
    // 轻微偏向小角度，抑制噪声下的过拟合
    const score = hit / covered - Math.abs(h) * 0.002
    if (score > bestScore) {
      bestScore = score
      bestHeading = h
    }
  }

  const bestFit = countHits(points, footprint, bestHeading)
  const hitRate = bestFit.covered ? bestFit.hit / bestFit.covered : 0
  const confidence = hitRate - baseRate
  const heading = confidence >= MIN_CONFIDENCE ? Math.round(bestHeading * 100) / 100 : 0

  // 航向确定后拟合高程偏移：取线点落在模型巷道截面内的偏移量
  // 模型巷道截面有一定高度，最优值常是一个区间，取其中最接近 0 的，避免无谓抬升/下沉
  const candidates: { y: number; mean: number }[] = []
  for (let y = -Y_OFFSET_RANGE; y <= Y_OFFSET_RANGE + 1e-9; y += Y_OFFSET_STEP) {
    const { samples, overflow } = measureYOverflow(points, footprint, heading, y)
    if (samples < MIN_SAMPLE_POINTS) continue
    candidates.push({ y, mean: overflow / samples })
  }
  const minMean = candidates.length ? Math.min(...candidates.map((c) => c.mean)) : Infinity
  let bestY = 0
  if (Number.isFinite(minMean)) {
    const nearOptimal = candidates.filter((c) => c.mean <= minMean + 1e-6)
    bestY = nearOptimal.reduce(
      (best, c) => (Math.abs(c.y) < Math.abs(best) ? c.y : best),
      nearOptimal[0].y,
    )
  }

  return {
    heading,
    yOffset: Math.round(bestY * 10) / 10,
    hitRate,
    confidence,
  }
}
