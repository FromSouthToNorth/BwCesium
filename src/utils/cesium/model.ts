import { toRaw, unref } from 'vue';
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
} from 'cesium';

import { message as andMessage } from 'ant-design-vue';

// 使用辅助函数和常量
import { getViewer, safeCesiumOperation, withErrorHandling } from './helpers';
import { MODEL_CONFIG } from './constants';

// 模型管理
const modelMap = new Map();
const initMatrix4Map = new Map();

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
    const added = viewer.scene.primitives.add(modelPrimitive);
    modelMap.set(customId, added);
    return added;
  }, `添加模型 ${customId} 失败`);
}

/**
 * 设置模型调试显示
 * 添加调试矩阵图元以可视化模型矩阵
 * @param {string} customId - 模型ID
 * @returns {void}
 */
function setModel(customId) {
  const model = modelMap.get(customId);
  if (!model) return;

  removeModel('debugModel');
  const debugModel = new DebugModelMatrixPrimitive({
    modelMatrix: model.modelMatrix,
    length: 200,
    width: 10,
  });
  addModel(`${customId}_debugModel`, debugModel);
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
    const prim = modelMap.get(customId);
    if (prim) {
      viewer.scene.primitives.remove(prim);
      modelMap.delete(customId);
    }
  }, `移除模型 ${customId} 失败`);
}

/**
 * 保存3D Tileset的初始矩阵
 * @param {Cesium3DTileset} tileset - 3D Tileset对象
 * @returns {void}
 */
function setInitMatrix4Map(tileset) {
  const { _url } = tileset;
  if (initMatrix4Map.has(_url)) return;
  initMatrix4Map.set(_url, { ...tileset.modelMatrix });
}

/**
 * 获取3D Tileset的初始矩阵
 * @param {Cesium3DTileset} tileset - 3D Tileset对象
 * @returns {Object|null} 初始矩阵或null
 */
function getInitMatrix4Map(tileset) {
  const { _url } = tileset;
  if (!initMatrix4Map.has(_url)) return null;
  return initMatrix4Map.get(_url);
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
    tilesetTranslate(model, translation, rotation, scale);
  } else if (model instanceof CesiumModel) {
    const { x, y, z } = rotation;
    setModelHeadingPitchRoll(model, x, y, z);
  } else {
    console.warn('Unsupported model type for translation');
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
  const { x, y, z } = translation;

  // 保存和获取初始矩阵
  setInitMatrix4Map(tileset);
  const modelMatrix = getInitMatrix4Map(tileset);
  if (!modelMatrix) return;

  const origin = tileset.boundingSphere.center;
  const toWorldMatrix = Transforms.eastNorthUpToFixedFrame(origin);

  // 计算平移矩阵
  const translatePosition = new Cartesian3(x, y, z);
  const worldPosition = Matrix4.multiplyByPoint(toWorldMatrix, translatePosition, new Cartesian3());
  const offset = Cartesian3.subtract(worldPosition, origin, new Cartesian3());
  const translationMatrix = Matrix4.fromTranslation(offset);

  const { x: rx, y: ry, z: rz } = rotation;

  // 计算旋转矩阵
  const toLocalMatrix = Matrix4.inverse(toWorldMatrix, new Matrix4());
  const rotateMatrix = Matrix4.clone(Matrix4.IDENTITY);

  if (rx !== 0) {
    const rotateXMatrix = Matrix4.fromRotation(Matrix3.fromRotationX(CesiumMath.toRadians(rx)));
    Matrix4.multiply(rotateXMatrix, rotateMatrix, rotateMatrix);
  }
  if (ry !== 0) {
    const rotateYMatrix = Matrix4.fromRotation(Matrix3.fromRotationY(CesiumMath.toRadians(ry)));
    Matrix4.multiply(rotateYMatrix, rotateMatrix, rotateMatrix);
  }
  if (rz !== 0) {
    const rotateZMatrix = Matrix4.fromRotation(Matrix3.fromRotationZ(CesiumMath.toRadians(rz)));
    Matrix4.multiply(rotateZMatrix, rotateMatrix, rotateMatrix);
  }

  // ENU坐标系下的结果矩阵
  const localResultMatrix = Matrix4.multiply(rotateMatrix, toLocalMatrix, new Matrix4());
  // 世界坐标系下的结果矩阵
  const rotationMatrix = Matrix4.multiply(toWorldMatrix, localResultMatrix, new Matrix4());

  // 计算缩放矩阵
  const scaleMatrix = Matrix4.fromScale(new Cartesian3(scale, scale, scale));

  // 组合所有变换
  let finalMatrix = Matrix4.clone(modelMatrix);
  finalMatrix = Matrix4.multiply(finalMatrix, scaleMatrix, finalMatrix);
  finalMatrix = Matrix4.multiply(finalMatrix, rotationMatrix, finalMatrix);
  finalMatrix = Matrix4.multiply(finalMatrix, translationMatrix, finalMatrix);

  // 应用最终矩阵
  tileset.modelMatrix = finalMatrix;
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
  const { mine } = model;
  if (!mine) return;

  const { L, B, z } = mine;
  const position = Cartesian3.fromDegrees(L, B, z);

  const hpr = new HeadingPitchRoll(
    CesiumMath.toRadians(heading),
    CesiumMath.toRadians(pitch),
    CesiumMath.toRadians(roll)
  );

  const modelMatrix = Transforms.headingPitchRollToFixedFrame(
    position,
    hpr,
    Ellipsoid.WGS84
  );

  model.modelMatrix = modelMatrix;

  // 验证设置结果
  const calculatedHpr = getHeadingPitchRollFromModelMatrix(model);
  if (calculatedHpr) {
    console.log(`从矩阵解析得到：Heading ${calculatedHpr.heading.toFixed(2)}°, Pitch ${calculatedHpr.pitch.toFixed(2)}°, Roll ${calculatedHpr.roll.toFixed(2)}°`);
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
  const rotationMatrix = Matrix4.fromRotationTranslation(
    new Matrix4(),
    matrix
  )

  // 2. 转成四元数
  const quaternion = Quaternion.fromRotationMatrix(matrix)

  // 3. 四元数 → HeadingPitchRoll（Cesium 内置方法）
  const hpr = new HeadingPitchRoll()
  HeadingPitchRoll.fromQuaternion(quaternion, hpr)

  // 4. 转回角度（度）
  return {
    heading: CesiumMath.toDegrees(hpr.heading),
    pitch: CesiumMath.toDegrees(hpr.pitch),
    roll: CesiumMath.toDegrees(hpr.roll)
  }
}

/**
 * 加载矿井巷道模型
 * @param {Object} mine - 矿井信息对象，包含边界、描述、坐标等参数
 * @param {boolean} is - 是否执行加载操作的标志位
 * @returns {void}
 */
export function loadMineTunnelModel(mine, is) {
  removeModel('hdModel');
  removeModel('hdModel_debugModel');

  if (!is) {
    return;
  }

  const { MineDesc, B, L, z } = mine;

  // 参数验证
  if (!MineDesc || typeof B === 'undefined' || typeof L === 'undefined' || typeof z === 'undefined') {
    console.error('Invalid target parameters for loadMineTunnelModel:', { MineDesc, B, L, z });
    return;
  }

  try {
    const position = Cartesian3.fromDegrees(L, B, z);
    const modelMatrix = Transforms.eastNorthUpToFixedFrame(position);

    // 使用常量配置加载巷道模型
    CesiumModel.fromGltfAsync({
      url: `/src/assets/models/${MineDesc}.glb`,
      modelMatrix,
      upAxis: Axis[MODEL_CONFIG.UP_AXIS],
      forwardAxis: Axis[MODEL_CONFIG.FORWARD_AXIS],
      silhouetteColor: MODEL_CONFIG.DEFAULT_SILHOUETTE_COLOR,
      silhouetteSize: MODEL_CONFIG.DEFAULT_SILHOUETTE_SIZE,
    }).then(model => {
      addModel('hdModel', model);
      model.readyEvent.addEventListener(() => {
        (model as any).mine = mine;
        console.log('---巷道模型加载成功---');
        setModel('hdModel');
      });
    }).catch(error => {
      console.error('Failed to load hdModel:', error);
      andMessage.error(`加载巷道模型失败: ${error.message}`);
    });
  } catch (error: any) {
    console.error('Error in loadMineTunnelModel:', error);
  }
}
