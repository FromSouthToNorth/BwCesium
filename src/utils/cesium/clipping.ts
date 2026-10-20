import { unref, toRaw, watch, ref } from 'vue'
import {
  Cartesian3,
  Cartographic,
  sampleTerrain,
  Cartesian2,
  ImageMaterialProperty,
  ClippingPolygon,
  Math as CesiumMath,
} from 'cesium'

import { notification } from 'ant-design-vue'

import { flyToBoundary } from './index'
import { CLIPPING_CONFIG } from './constants'
import { isArray } from '../is'
import { useSetting } from '@/hooks/setting/useSetting'
import { turfPolygon, densifyPolygon, turfConcave, turfUnion, turfTransformScale } from '../turf'

import { getTraverseBoundary } from '../mqtt/publish'

import { useGroupCompanyLevelMine } from '@/hooks/useGroupCompanyLevelMine'

// 使用辅助函数
import { getViewer, safeCesiumOperation, clearEntityArray } from './helpers'

const { getTraverseBoundaryGeoJSON } = useGroupCompanyLevelMine()

const { setPageLoading } = useSetting()

// 常量配置
const TEXTURE_PATH_1 = '/src/assets/soil_texture.png'
const TEXTURE_PATH_2 = '/src/assets/soil_texture2.png'
const ENTITY_IDS = ['ClippingWall', 'ClippingWallDM']
const clippingEntities: any[] = []

/**
 * 清除裁剪墙体实体
 * @returns {void}
 */
function clearWall() {
  clearEntityArray(clippingEntities)
}

/**
 * 清除所有裁剪效果
 * 包括移除裁剪多边形和清理墙体实体
 * @returns {void}
 */
function clearClipping() {
  safeCesiumOperation((viewer) => {
    const globe = viewer.scene.globe
    const clippingPolygons = globe.clippingPolygons
    clippingPolygons.removeAll()
    clippingPolygons.enabled = false
    clearWall()
  }, '清除裁剪失败')
}

/**
 * 清除所有裁剪效果并恢复实体高度
 * @returns {void}
 */
export function clearClippingWithElevation() {
  // 恢复实体高度
  // restoreAllEntitiesElevation();

  // 清除裁切
  clearClipping()
}

/**
 * 过滤坐标环中的非法值（NaN/undefined 等），避免进入几何管线导致渲染停止
 * @param {number[][]} coordinates - [lng, lat] 坐标环
 * @returns {number[][]} 仅含有限数值的坐标环
 */
function sanitizeRing(coordinates) {
  return (coordinates || []).filter(
    (coord) => isArray(coord) && Number.isFinite(coord[0]) && Number.isFinite(coord[1]),
  )
}

/**
 * 经纬度环转闭合的 Cartesian3 数组（供 ClippingPolygon 使用）
 * @param {number[][]} coordinates - [lng, lat] 坐标环
 * @returns {Array<Cartesian3>} 闭合环的笛卡尔坐标数组
 */
function toClosedPositions(coordinates) {
  const first = coordinates[0]
  const last = coordinates[coordinates.length - 1]
  const closed =
    isArray(first) && isArray(last) && first[0] === last[0] && first[1] === last[1]
      ? coordinates
      : coordinates.concat([first])
  return closed.map((coord) => Cartesian3.fromDegrees(coord[0], coord[1]))
}

/**
 * 等待真实地形提供程序就绪（Viewer 初始为椭球占位，World Terrain 异步加载后才替换）
 * 超时后返回当前 provider，退化到既有行为
 * @param {Cesium.Viewer} viewer - Cesium viewer
 * @param {number} [timeout=5000] - 等待超时（毫秒）
 * @returns {Promise<Cesium.TerrainProvider>} 地形提供程序
 */
function whenTerrainReady(viewer, timeout = 5000) {
  const provider = viewer.terrainProvider
  // 椭球占位 provider 没有 availability，真实地形（World Terrain）才有
  if (provider.availability) return Promise.resolve(provider)
  return new Promise((resolve) => {
    const timer = setTimeout(finish, timeout)
    function finish() {
      clearTimeout(timer)
      removeChanged()
      resolve(viewer.terrainProvider)
    }
    const removeChanged = viewer.scene.terrainProviderChanged.addEventListener(() => {
      if (viewer.terrainProvider.availability) finish()
    })
  })
}

/**
 * 预加载墙体贴图：实体添加后贴图若未就绪会先显示为白色，先预热浏览器缓存
 * @returns {Promise<void>} 两张贴图均完成加载（失败也放行）后 resolve
 */
function preloadWallTextures() {
  const load = (src: string) =>
    new Promise<void>((resolve) => {
      const img = new Image()
      img.onload = () => resolve()
      img.onerror = () => resolve()
      img.src = src
    })
  return Promise.all([load(TEXTURE_PATH_1), load(TEXTURE_PATH_2)])
}

/**
 * 采样地形并添加裁剪墙体
 * 固定层级采样：最精细采样需拉取覆盖区全部深层地形瓦片（World Terrain 走外网，动辄上千请求），
 * 墙体仅需贴地美观，固定层级（约 1km 瓦片）整片区域只需少量请求
 * @param {Array<Cartesian3>} positions - 墙体位置数组
 * @param {Array<Cartographic>} terrHeights - 待采样的地形点（就地回填高度）
 * @param {number} minZ - 最小高度值
 * @returns {Promise<void>} 墙体就绪（添加或判定跳过）后 resolve；整体有超时兜底
 */
function buildWall(positions, terrHeights, minZ): Promise<void> {
  return safeCesiumOperation((viewer) => {
    // 贴图与采样并行预热
    const texturesReady = preloadWallTextures()
    const task = whenTerrainReady(viewer)
      .then((provider) => {
        // 采样后检查有效高度：瓦片请求失败时 Cesium 会把对应点高度置为 undefined
        const sample = (level: number) =>
          sampleTerrain(provider, level, terrHeights).then(() =>
            terrHeights.some((e) => Number.isFinite(e.height)),
          )
        return sample(CLIPPING_CONFIG.TERRAIN_SAMPLE_LEVEL).then((ok) => {
          if (ok) return true
          console.warn(
            `层级 ${CLIPPING_CONFIG.TERRAIN_SAMPLE_LEVEL} 采样全部失败（provider: ${provider.constructor.name}），降级到层级 ${CLIPPING_CONFIG.TERRAIN_RETRY_LEVEL} 重试`,
          )
          return sample(CLIPPING_CONFIG.TERRAIN_RETRY_LEVEL)
        })
      })
      .then((ok) => {
        return texturesReady.then(() => {
          if (!ok) {
            console.warn('地形采样仍不可用，跳过墙体绘制（裁切本身不受影响）')
            return
          }
          console.log('Terrain samples processed successfully')
          addWall(positions, terrHeights, minZ)
        })
      })
      .catch((error) => {
        console.error('Error sampling terrain:', error)
      })
    // 采样异常挂起时兜底放行，避免裁切被无限拖住
    return Promise.race([
      task,
      new Promise<void>((resolve) => setTimeout(resolve, CLIPPING_CONFIG.WALL_BUILD_TIMEOUT)),
    ])
  }, '地形采样失败')
}

/**
 * 应用裁剪效果到指定位置
 * @param {Array<Cartesian3>} positions - 裁剪多边形的顶点位置数组
 * @returns {void}
 */
function clipping(positions) {
  safeCesiumOperation((viewer) => {
    const globe = viewer.scene.globe
    const clippingPolygons = globe.clippingPolygons
    const newClippingPolygon = new ClippingPolygon({ positions })
    clippingPolygons.add(newClippingPolygon)
    clippingPolygons.enabled = true
    setPageLoading(false)
  }, '应用裁剪失败')
}

/**
 * 矿山裁剪功能
 * 根据矿山边界和最小高度进行地形裁剪
 * @param {Object} mine - 矿山对象，包含边界和最小高度信息
 * @param {boolean} is - 是否执行裁剪操作
 * @throws {Error} 当矿山参数无效时抛出错误
 * @returns {void}
 *
 * @example
 * // 使用示例
 * const mine = {
 *   boundary: [[lon1, lat1], [lon2, lat2], [lon3, lat3]],
 *   minZ: 100
 * };
 * mineClipping(mine, true);
 */
export function mineClipping(mine, is) {
  clearClippingWithElevation()

  if (!is) {
    setPageLoading(false)
    return
  }

  // 参数验证
  if (!mine || !mine.boundary || typeof mine.minZ === 'undefined') {
    throw new Error('Invalid mine parameter: boundary and minZ are required')
  }

  if (!isArray(mine.boundary) || mine.boundary.length < 3) {
    throw new Error('Boundary must be an array with at least 3 coordinates')
  }

  setPageLoading(true)
  const { minZ } = mine
  // 过滤非法坐标，避免 NaN 进入几何管线
  const boundary = sanitizeRing(mine.boundary)

  try {
    if (boundary.length < 3) {
      notification['error']({
        description: '矿山边界数据无效, 请检查数据!',
      } as any)
      setPageLoading(false)
      return
    }

    // 处理边界
    const _boundary = turfPolygon({ coordinates: [boundary] })
    const tfPolygon = densifyPolygon(_boundary, 100)

    const coordinates = tfPolygon.geometry.coordinates[0]
    const positions = coordinates.map((coord) => Cartesian3.fromDegrees(coord[0], coord[1]))
    const cartographic = positions.map((pos) => Cartographic.fromCartesian(pos))
    // 裁剪多边形用原始边界：加密不改变形状，却让逐像素点内判定的边数成倍增长
    const clipPositions = toClosedPositions(boundary)

    // 墙体采样不依赖相机，立即开始；裁切与墙体就绪后同步生效
    const wallTask = buildWall(positions, cartographic, minZ)
    flyToBoundary({ boundary, pad: 0.01 }, () => {
      wallTask.then(() => clipping(clipPositions))
    })
  } catch (error: any) {
    setPageLoading(false)
    console.error('Error in mineClipping:', error)
    throw error
  }
}

/**
 * 添加裁剪墙体
 * 创建墙体实体和多边形实体来表示裁剪效果
 * @param {Array<Cartesian3>} positions - 墙体位置数组
 * @param {Array<Cartographic>} terrHeights - 地形高度数组
 * @param {number} minZ - 最小高度值，默认为0
 * @returns {void}
 */
function addWall(positions, terrHeights, minZ = 0) {
  safeCesiumOperation((viewer) => {
    // 高度残缺点直接进几何管线会在 worker 里抛 NaN 异常打停渲染循环，这里统一防御
    const finiteHeights = terrHeights.map((e) => e.height).filter(Number.isFinite)
    if (finiteHeights.length === 0 || !Number.isFinite(minZ)) {
      console.error('裁剪墙体高度数据无效，跳过墙体绘制:', {
        minZ,
        sampled: finiteHeights.length,
        total: terrHeights.length,
      })
      return
    }
    // 采样失败的点回退到最低采样高度，保证墙体不悬空
    const fallbackHeight = Math.min(...finiteHeights)
    const minimumHeights = terrHeights.map(
      (e) =>
        (Number.isFinite(e.height) ? e.height : fallbackHeight) + CLIPPING_CONFIG.WALL_TERRAIN_BIAS,
    )
    // 添加墙体
    const wall1 = viewer.entities.add({
      id: ENTITY_IDS[0],
      wall: {
        positions: positions,
        minimumHeights,
        maximumHeights: new Array(positions.length).fill(minZ),
        material: new ImageMaterialProperty({
          image: TEXTURE_PATH_1,
          repeat: new Cartesian2(80, 80),
        }),
      },
    })
    clippingEntities.push(wall1)

    // 添加多边形
    const wall2 = viewer.entities.add({
      id: ENTITY_IDS[1],
      polygon: {
        hierarchy: positions,
        material: new ImageMaterialProperty({
          image: TEXTURE_PATH_2,
          repeat: new Cartesian2(80, 80),
        }),
        height: minZ,
      },
    })
    clippingEntities.push(wall2)

    console.log('裁切壁纸底纸成功')
  }, '添加裁剪墙体失败')
}

const stopMap = new Map()
/**
 * 遍历边界裁剪函数
 * 清除现有裁剪，根据传入的mine和is参数进行边界裁剪处理
 * @param {Object} mine - 矿井对象，包含矿井名称等信息
 * @param {boolean} is - 控制标志，决定是否执行后续逻辑
 * @returns {void}
 */
export function traverseBoundaryClipping(mine, is) {
  clearClippingWithElevation()
  if (stopMap.has(mine.name)) {
    stopMap.get(mine.name)()
    stopMap.delete(mine.name)
  }
  if (!is) return
  setPageLoading(true)
  getTraverseBoundary(mine.name)
  let index = 0
  const stop = watch(
    () => unref(getTraverseBoundaryGeoJSON),
    (newVal) => {
      const { mineBoundary, traverse } = toRaw(unref(newVal)) as any
      let cliPolygon,
        polygon,
        minZ = -100
      if (mineBoundary && traverse) {
        const _polygon = turfConcave(traverse)
        minZ = traverse.minZ ?? -100
        polygon = turfUnion(mineBoundary, _polygon)
      } else if (traverse) {
        minZ = traverse.minZ ?? -100
        polygon = turfConcave(traverse)
      } else if (mineBoundary) {
        polygon = mineBoundary
      } else {
        notification['error']({
          description: '井田边界巷道数据都没有, 请检查数据!',
        } as any)
        setPageLoading(false)
        return
      }
      cliPolygon = densifyPolygon(polygon, 50)
      geojsonClipping(cliPolygon, minZ)
    },
  )
  stopMap.set(mine.name, stop)
}

/**
 * 对GeoJSON数据进行地理空间裁剪处理
 * 将GeoJSON几何数据转换为裁剪效果
 * @param {Object} geojson - GeoJSON格式的地理数据对象，包含geometry属性
 * @param {number} minZ - 裁剪操作的最小高度值
 * @returns {void}
 *
 * @example
 * // 使用示例
 * const geojson = {
 *   type: 'Feature',
 *   geometry: {
 *     type: 'Polygon',
 *     coordinates: [[[lon1, lat1], [lon2, lat2], [lon3, lat3]]]
 *   }
 * };
 * geojsonClipping(geojson, 100);
 */
export function geojsonClipping(geojson, minZ) {
  if (!geojson || !geojson.geometry || !geojson.geometry.coordinates) {
    console.error('Invalid GeoJSON data')
    return
  }

  // 过滤非法坐标，避免 NaN 进入几何管线；数据不足时直接退出
  const coordinates = sanitizeRing(geojson.geometry.coordinates[0])
  if (coordinates.length < 3) {
    console.error('Invalid GeoJSON data: ring has fewer than 3 valid points')
    return
  }
  const positions = coordinates.map((coord) => Cartesian3.fromDegrees(coord[0], coord[1]))
  const cartographics = positions.map((pos) => Cartographic.fromCartesian(pos))
  // 裁剪多边形用未加密的原始环，避免逐像素判定边数膨胀
  const clipPositions = toClosedPositions(coordinates)

  try {
    // 墙体采样不依赖相机，立即开始；裁切与墙体就绪后同步生效
    const wallTask = buildWall(positions, cartographics, minZ)
    flyToBoundary({ boundary: coordinates, pad: 0.01 }, () => {
      wallTask.then(() => clipping(clipPositions))
    })
  } catch (error: any) {
    console.error('Error in geojsonClipping:', error)
    setPageLoading(false)
  }
}
