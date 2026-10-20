import { toRaw, unref, watch } from 'vue'
import {
  Transforms,
  Cartesian3,
  Matrix4,
  Matrix3,
  Math as CesiumMath,
  Cesium3DTileset,
  Model as CesiumModel,
  Quaternion,
  HeadingPitchRoll,
  Ellipsoid,
  Axis,
  DebugModelMatrixPrimitive,
  Color as CesiumColor,
} from 'cesium'

import { message as andMessage } from 'ant-design-vue'

// 使用辅助函数和常量
import { getViewer, safeCesiumOperation } from './helpers'
import { MODEL_CONFIG } from './constants'
import { convertObjToGltfBlobUrl } from './objToGltf'
import { getConvertedModelUrl } from './tunnelModelCache'
import {
  fitTunnelCalibration,
  loadCachedCalibration,
  saveCachedCalibration,
} from './tunnelCalibration'
import { getTunnelLineString } from '../mqtt/publish'
import { useGroupCompanyLevelMine } from '@/hooks/useGroupCompanyLevelMine'

// 模型管理
const modelMap = new Map()
const initMatrix4Map = new Map()

/**
 * 添加模型到场景中
 * @param {string} customId - 自定义ID
 * @param {Object} modelPrimitive - 模型对象
 * @returns {Object} 添加的模型对象
 *
 * @example
 * // 使用示例
 * const model = await CesiumModel.fromGltfAsync(options);
 * addModel('myModel', model);
 */
export function addModel(customId, modelPrimitive) {
  return safeCesiumOperation((viewer) => {
    const added = viewer.scene.primitives.add(modelPrimitive)
    modelMap.set(customId, added)
    return added
  }, `添加模型 ${customId} 失败`)
}

/**
 * 设置模型调试显示
 * 添加调试矩阵图元以可视化模型矩阵
 * @param {string} customId - 模型ID
 * @returns {void}
 */
function setModel(customId) {
  const model = modelMap.get(customId)
  if (!model) return

  removeModel('debugModel')
  const debugModel = new DebugModelMatrixPrimitive({
    modelMatrix: model.modelMatrix,
    length: 200,
    width: 10,
  })
  addModel(`${customId}_debugModel`, debugModel)
}

/**
 * 从场景中移除模型
 * @param {string} customId - 自定义ID
 * @returns {void}
 *
 * @example
 * // 使用示例
 * removeModel('myModel');
 */
export function removeModel(customId) {
  safeCesiumOperation((viewer) => {
    const prim = modelMap.get(customId)
    if (prim) {
      viewer.scene.primitives.remove(prim)
      modelMap.delete(customId)
    }
  }, `移除模型 ${customId} 失败`)
}

/**
 * 保存3D Tileset的初始矩阵
 * @param {Cesium3DTileset} tileset - 3D Tileset对象
 * @returns {void}
 */
function setInitMatrix4Map(tileset) {
  const { _url } = tileset
  if (initMatrix4Map.has(_url)) return
  initMatrix4Map.set(_url, { ...tileset.modelMatrix })
}

/**
 * 获取3D Tileset的初始矩阵
 * @param {Cesium3DTileset} tileset - 3D Tileset对象
 * @returns {Object|null} 初始矩阵或null
 */
function getInitMatrix4Map(tileset) {
  const { _url } = tileset
  if (!initMatrix4Map.has(_url)) return null
  return initMatrix4Map.get(_url)
}

/**
 * 平移、旋转和缩放模型
 * 支持3D Tileset和普通Model两种类型
 * @param {Object} model - 模型对象（Cesium3DTileset 或 CesiumModel）
 * @param {Object} translation - 平移向量 {x, y, z}
 * @param {Object} rotation - 旋转角度 {x, y, z}（度）
 * @param {number} scale - 缩放比例
 * @returns {void}
 *
 * @example
 * // 使用示例
 * translateModel(tileset, {x: 10, y: 20, z: 5}, {x: 0, y: 45, z: 0}, 1.5);
 */
export function translateModel(model, translation, rotation, scale) {
  if (model instanceof Cesium3DTileset) {
    tilesetTranslate(model, translation, rotation, scale)
  } else if (model instanceof CesiumModel) {
    const { x, y, z } = rotation
    setModelHeadingPitchRoll(model, x, y, z)
  } else {
    console.warn('Unsupported model type for translation')
  }
}

/**
 * 平移、旋转和缩放3D Tileset模型
 * Z轴代表地上地下，X轴代表东，Y轴代表北
 * @param {Cesium3DTileset} tileset - 3D Tileset对象
 * @param {Object} translation - 平移向量 {x, y, z}
 * @param {Object} rotation - 旋转角度 {x, y, z}（度）
 * @param {number} scale - 缩放比例
 * @returns {void}
 */
function tilesetTranslate(tileset, translation, rotation, scale) {
  const { x, y, z } = translation

  // 保存和获取初始矩阵
  setInitMatrix4Map(tileset)
  const modelMatrix = getInitMatrix4Map(tileset)
  if (!modelMatrix) return

  const origin = tileset.boundingSphere.center
  const toWorldMatrix = Transforms.eastNorthUpToFixedFrame(origin)

  // 计算平移矩阵
  const translatePosition = new Cartesian3(x, y, z)
  const worldPosition = Matrix4.multiplyByPoint(toWorldMatrix, translatePosition, new Cartesian3())
  const offset = Cartesian3.subtract(worldPosition, origin, new Cartesian3())
  const translationMatrix = Matrix4.fromTranslation(offset)

  const { x: rx, y: ry, z: rz } = rotation

  // 计算旋转矩阵
  const toLocalMatrix = Matrix4.inverse(toWorldMatrix, new Matrix4())
  const rotateMatrix = Matrix4.clone(Matrix4.IDENTITY)

  if (rx !== 0) {
    const rotateXMatrix = Matrix4.fromRotation(Matrix3.fromRotationX(CesiumMath.toRadians(rx)))
    Matrix4.multiply(rotateXMatrix, rotateMatrix, rotateMatrix)
  }
  if (ry !== 0) {
    const rotateYMatrix = Matrix4.fromRotation(Matrix3.fromRotationY(CesiumMath.toRadians(ry)))
    Matrix4.multiply(rotateYMatrix, rotateMatrix, rotateMatrix)
  }
  if (rz !== 0) {
    const rotateZMatrix = Matrix4.fromRotation(Matrix3.fromRotationZ(CesiumMath.toRadians(rz)))
    Matrix4.multiply(rotateZMatrix, rotateMatrix, rotateMatrix)
  }

  // ENU坐标系下的结果矩阵
  const localResultMatrix = Matrix4.multiply(rotateMatrix, toLocalMatrix, new Matrix4())
  // 世界坐标系下的结果矩阵
  const rotationMatrix = Matrix4.multiply(toWorldMatrix, localResultMatrix, new Matrix4())

  // 计算缩放矩阵
  const scaleMatrix = Matrix4.fromScale(new Cartesian3(scale, scale, scale))

  // 组合所有变换
  let finalMatrix = Matrix4.clone(modelMatrix)
  finalMatrix = Matrix4.multiply(finalMatrix, scaleMatrix, finalMatrix)
  finalMatrix = Matrix4.multiply(finalMatrix, rotationMatrix, finalMatrix)
  finalMatrix = Matrix4.multiply(finalMatrix, translationMatrix, finalMatrix)

  // 应用最终矩阵
  tileset.modelMatrix = finalMatrix
}

/**
 * 设置模型的航向、俯仰和横滚角度
 * @param {CesiumModel} model - Cesium模型对象
 * @param {number} pitch - 俯仰角度（度）
 * @param {number} roll - 横滚角度（度）
 * @param {number} heading - 航向角度（度）
 * @returns {void}
 */
function setModelHeadingPitchRoll(model, pitch, roll, heading) {
  const { mine } = model
  if (!mine) return

  const { L, B, z } = mine
  const position = Cartesian3.fromDegrees(L, B, z)

  const hpr = new HeadingPitchRoll(
    CesiumMath.toRadians(heading),
    CesiumMath.toRadians(pitch),
    CesiumMath.toRadians(roll),
  )

  const modelMatrix = Transforms.headingPitchRollToFixedFrame(position, hpr, Ellipsoid.WGS84)

  model.modelMatrix = modelMatrix

  // 验证设置结果
  const calculatedHpr = getHeadingPitchRollFromModelMatrix(model)
  if (calculatedHpr) {
    console.log(
      `从矩阵解析得到：Heading ${calculatedHpr.heading.toFixed(2)}°, Pitch ${calculatedHpr.pitch.toFixed(2)}°, Roll ${calculatedHpr.roll.toFixed(2)}°`,
    )
  }
}

/**
 * 从 modelMatrix 反解 Heading Pitch Roll（单位：度）
 * @param {Cesium.Model} model
 * @returns {Object} {heading, pitch, roll} 单位：度
 */
function getHeadingPitchRollFromModelMatrix(model) {
  if (!model || !model.ready || !model.modelMatrix) return null

  const matrix = model.modelMatrix

  // 1. 获取旋转部分（4x4 旋转矩阵）
  const rotationMatrix = Matrix4.fromRotationTranslation(new Matrix4(), matrix)

  // 2. 转成四元数
  const quaternion = Quaternion.fromRotationMatrix(matrix)

  // 3. 四元数 → HeadingPitchRoll（Cesium 内置方法）
  const hpr = new HeadingPitchRoll()
  HeadingPitchRoll.fromQuaternion(quaternion, hpr)

  // 4. 转回角度（度）
  return {
    heading: CesiumMath.toDegrees(hpr.heading),
    pitch: CesiumMath.toDegrees(hpr.pitch),
    roll: CesiumMath.toDegrees(hpr.roll),
  }
}

/**
 * 构建巷道模型的放置矩阵（含配准校正）
 * 校正绕模型原点（矿井锚点）生效：先抬升 yOffset，再绕局部天轴旋转 heading
 * @param {Object} anchor - 锚点 { L, B, z }
 * @param {Object} calibration - 校正参数 { heading?, yOffset? }
 * @returns {Matrix4} 模型矩阵
 */
function buildTunnelModelMatrix(anchor, calibration: { heading?: number; yOffset?: number } = {}) {
  const { L, B, z } = anchor
  const position = Cartesian3.fromDegrees(L, B, z + (calibration.yOffset ?? 0))
  const modelMatrix = Transforms.eastNorthUpToFixedFrame(position)
  if (!calibration.heading) return modelMatrix
  return Matrix4.multiply(
    modelMatrix,
    Matrix4.fromRotationTranslation(
      Matrix3.fromRotationZ(CesiumMath.toRadians(calibration.heading)),
    ),
    modelMatrix,
  )
}

// 当前巷道模型及其锚点，供控制台实时标定使用
let caliberatingModel: any = null
let caliberatingAnchor: any = null

/**
 * 实时调整巷道模型配准（仅开发环境暴露到 window，用于现场标定）
 * @param {number} heading - 绕竖轴旋转角（度，正值=逆时针）
 * @param {number} yOffset - 垂直偏移（米，正值=抬高）
 * @returns {void}
 */
function applyTunnelCalibration(heading = 0, yOffset = 0) {
  if (!caliberatingModel || !caliberatingAnchor) {
    console.warn('巷道模型尚未加载，无法标定')
    return
  }
  caliberatingModel.modelMatrix = buildTunnelModelMatrix(caliberatingAnchor, { heading, yOffset })
  saveCachedCalibration(caliberatingAnchor.MineDesc, { heading, yOffset })
  console.log(
    `已应用并缓存标定 heading=${heading}° yOffset=${yOffset}m（清除 localStorage 中的 bwcesium:tunnel-calib 可恢复自动拟合）`,
  )
}

if (import.meta.env.DEV) {
  ;(window as any).__tunnelCalibrate = applyTunnelCalibration
}

/**
 * 用当前矿的巷道线自动拟合模型配准参数并应用
 * 每个矿只需首次加载时拟合一次，结果按 MineDesc 缓存，后续加载直接复用
 * @param {Object} mine - 矿井对象
 * @param {Object|null} footprint - 模型水平足迹
 * @param {Object} model - Cesium 模型实例
 * @returns {Promise<void>}
 */
async function autoCalibrateTunnelModel(mine, footprint, model): Promise<void> {
  if (!footprint) return
  try {
    const { getTunnelGeoJSON } = useGroupCompanyLevelMine()
    // getTunnelGeoJSON 是跨矿共享的模块级状态，切换矿井后可能仍是上一个矿的数据。
    // 只有当前矿的巷道图层确实在显示时才能直接复用，否则必须拉新数据并等待“下一次更新”。
    const lineLayerOn = !!getViewer()?.dataSources?.getByName?.('tunnel_LineString')?.length
    const before = unref(getTunnelGeoJSON)
    let geojson = lineLayerOn ? before : null
    let source = '复用当前巷道图层数据'

    if (!geojson) {
      // 巷道图层未开启时，复用同一 MQTT 数据通道拉取一次（仅用于配准，不渲染）
      source = '拉取巷道线数据'
      getTunnelLineString(mine.name)
      geojson = await new Promise<any>((resolve) => {
        const stop = watch(
          getTunnelGeoJSON,
          (val) => {
            // 必须等到新数据，避免误用上一个矿遗留的线
            if (!val || val === before) return
            stop()
            clearTimeout(timer)
            resolve(val)
          },
          { flush: 'sync' },
        )
        const timer = setTimeout(() => {
          stop()
          resolve(null)
        }, 15000)
      })
    }
    if (!geojson) {
      console.warn(`巷道模型自动配准跳过（${mine.MineDesc}）：未获取到本矿巷道线数据`)
      return
    }

    const result = fitTunnelCalibration(geojson, footprint, mine)
    if (!result) {
      console.warn(`巷道模型自动配准跳过（${mine.MineDesc}）：巷道线数据不足`)
      return
    }
    console.log(
      `---巷道模型自动配准(${mine.MineDesc}, ${source}): heading=${result.heading}° yOffset=${result.yOffset}m ` +
        `命中率 ${(result.hitRate * 100).toFixed(1)}%（提升 ${(result.confidence * 100).toFixed(1)}%）---`,
    )
    // 与未校正基本一致时不改动，避免噪声导致抖动
    if (!result.heading && !result.yOffset) return

    model.modelMatrix = buildTunnelModelMatrix(mine, result)
    caliberatingModel = model
    caliberatingAnchor = mine
    saveCachedCalibration(mine.MineDesc, {
      heading: result.heading,
      yOffset: result.yOffset,
    })
  } catch (error) {
    console.warn('巷道模型自动配准失败:', error)
  }
}

/**
 * 加载矿井巷道模型
 * @param {Object} mine - 矿井信息对象，包含边界、描述、坐标等参数
 * @param {boolean} is - 是否执行加载操作的标志位
 * @returns {void}
 */
export function loadMineTunnelModel(mine, is) {
  removeModel('hdModel')
  removeModel('hdModel_debugModel')

  if (!is) {
    return
  }

  const { MineDesc, B, L, z } = mine

  // 参数验证
  if (
    !MineDesc ||
    typeof B === 'undefined' ||
    typeof L === 'undefined' ||
    typeof z === 'undefined'
  ) {
    console.error('Invalid target parameters for loadMineTunnelModel:', { MineDesc, B, L, z })
    return
  }

  try {
    // 优先使用该矿已缓存的自动配准结果，其次用配置里的手工校正
    const cachedCalibration = loadCachedCalibration(MineDesc)
    const modelMatrix = buildTunnelModelMatrix(
      mine,
      cachedCalibration ?? MODEL_CONFIG.TUNNEL_MODEL_CALIBRATION[MineDesc] ?? {},
    )

    // 巷道模型为服务端 OBJ+MTL，先转换成 glTF 再交给 Cesium 加载
    const modelUrl = MODEL_CONFIG.TUNNEL_MODEL_URL.replace(
      '{MineDesc}',
      encodeURIComponent(MineDesc),
    )
    const mtlUrl = MODEL_CONFIG.TUNNEL_MODEL_MTL_URL.replace(
      '{MineDesc}',
      encodeURIComponent(MineDesc),
    )

    const loadTunnel = async () => {
      const { url: blobUrl, footprint } = await getConvertedModelUrl(modelUrl, mtlUrl, () =>
        convertObjToGltfBlobUrl(modelUrl, mtlUrl, MODEL_CONFIG.TUNNEL_TEXTURE_MAX_SIZE),
      )
      try {
        const model = await CesiumModel.fromGltfAsync({
          url: blobUrl,
          modelMatrix,
          upAxis: Axis[MODEL_CONFIG.UP_AXIS],
          forwardAxis: Axis[MODEL_CONFIG.FORWARD_AXIS],
          silhouetteColor: MODEL_CONFIG.DEFAULT_SILHOUETTE_COLOR,
          silhouetteSize: MODEL_CONFIG.DEFAULT_SILHOUETTE_SIZE,
        })
        addModel('hdModel', model)
        model.readyEvent.addEventListener(() => {
          ;(model as any).mine = mine
          caliberatingModel = model
          caliberatingAnchor = mine
          console.log('---巷道模型加载成功---')
          if (import.meta.env.DEV) {
            console.log(
              '如模型与巷道数据存在配准偏差，可用 __tunnelCalibrate(heading度, yOffset米) 实时标定，正值 heading=逆时针、yOffset=抬高',
            )
          }
          setModel('hdModel')
          URL.revokeObjectURL(blobUrl)
          // 无缓存配准且足迹可用时，用当前矿自己的巷道线自动拟合校正量
          if (!cachedCalibration) {
            autoCalibrateTunnelModel(mine, footprint, model)
          }
        })
      } catch (error) {
        URL.revokeObjectURL(blobUrl)
        throw error
      }
    }

    andMessage.loading({
      content: '巷道模型加载中，首次加载需下载并转换...',
      key: 'hdModelLoading',
      duration: 0,
    })
    loadTunnel()
      .catch((error) => {
        console.error('Failed to load hdModel:', error)
        andMessage.error(`加载巷道模型失败: ${error.message}`)
      })
      .finally(() => andMessage.destroy('hdModelLoading'))
  } catch (error: any) {
    console.error('Error in loadMineTunnelModel:', error)
  }
}
