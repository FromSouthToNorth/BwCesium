import {
  ScreenSpaceEventType,
  Cesium3DTileset,
  Model,
  Entity,
  defined,
  Matrix4,
  Math as CesiumMath,
  BoundingSphere,
  Intersect,
  Cartesian3,
  Rectangle,
} from 'cesium';

import { toRaw, unref, ref, computed, onUnmounted } from 'vue';
import { debounce as lodashDebounce } from 'lodash-es';

import { clusteringZoom } from './clustering';
import { getPolylineGeometricCenter, getViewer } from './index';
import { getGroupCompanyContextmenuItems } from '@/utils/mqtt/publish';

// 常量配置
const VIEW_FRUSTUM_CHECK_THRESHOLD = 0.0001; // 相机移动阈值
const HEIGHT_THRESHOLD_LOW = 46000; // 低高度阈值
const HEIGHT_THRESHOLD_HIGH = 66000; // 高高度阈值
const DEBOUNCE_DELAY = 100; // 防抖延迟（毫秒）

/**
 * 创建拾取特征的描述HTML表格
 * @param {Object} pickedFeature - 拾取的特征对象
 * @returns {string|undefined} HTML表格字符串或undefined
 */
function createPickedFeatureDescription(pickedFeature) {
  if (!pickedFeature || !pickedFeature.columns) {
    return undefined;
  }

  try {
    const columns = pickedFeature.columns;
    if (!Array.isArray(columns)) {
      return undefined;
    }

    const rows = columns.map(({ title, dataIndex }) => {
      const value = pickedFeature[dataIndex];
      if (value === undefined || value === null || value === '') {
        return '';
      }
      return `<tr><th>${title}</th><td>${value}</td></tr>`;
    }).filter(row => row !== '');

    if (rows.length === 0) {
      return undefined;
    }

    return `<table class="cesium-infoBox-defaultTable">${rows.join('')}</table>`;
  } catch (error) {
    console.error('Error creating feature description:', error);
    return undefined;
  }
}

const activeEntityRef = ref(null);

export const getActiveEntity = computed(() => unref(activeEntityRef));

/**
 * 获取实体的位置
 * @param {Entity} entity - Cesium实体
 * @param {Cartesian3} pickPosition - 拾取位置（备用）
 * @returns {Cartesian3|undefined} 实体位置
 */
function getPos(entity, pickPosition) {
  if (!entity) {
    return pickPosition;
  }

  try {
    // 优先使用实体位置
    if (entity.position && typeof entity.position.getValue === 'function') {
      const position = entity.position.getValue();
      if (position) {
        return position;
      }
    }

    // 其次使用折线几何中心
    if (entity.polyline && entity.polyline.positions) {
      const positions = entity.polyline.positions.getValue();
      if (positions && positions.length > 0) {
        return getPolylineGeometricCenter(positions);
      }
    }

    // 最后返回拾取位置
    return pickPosition;
  } catch (error) {
    console.error('Error getting entity position:', error);
    return pickPosition;
  }
}

/**
 * 检查点是否在相机视锥体内
 * @param {Cartesian3} position - 要检查的点
 * @param {Scene} scene - Cesium场景
 * @returns {boolean} 是否在视锥体内
 */
function isPositionInFrustum(position, scene) {
  if (!position) {
    return false;
  }

  try {
    const camera = scene.camera;
    const frustum = camera.frustum;

    // 使用视锥体计算剔除体积
    const cullingVolume = frustum.computeCullingVolume(
      camera.positionWC,
      camera.directionWC,
      camera.upWC
    );

    // 创建一个半径为0的边界球（表示点）
    const boundingSphere = new BoundingSphere(position, 0);

    // 计算可见性：INSIDE = 0, INTERSECTING = 1, OUTSIDE = -1
    const visibility = cullingVolume.computeVisibility(boundingSphere);

    return visibility !== Intersect.OUTSIDE;
  } catch (error) {
    console.error('Error checking position in frustum:', error);
    return false;
  }
}

/**
 * 处理实体拾取逻辑
 * @param {Object} pickedObject - 拾取的对象
 * @param {Cartesian3} pickPosition - 拾取位置
 * @param {Scene} scene - Cesium场景
 * @returns {Object|null} 实体信息对象或null
 */
function handleEntityPick(pickedObject, pickPosition, scene) {
  if (!(pickedObject.id instanceof Entity)) {
    return null;
  }

  const entity = pickedObject.id;
  console.log('entity: ', entity);


  if (!entity.properties) {
    return;
  }

  const properties = entity.properties;
  const propertyValues = properties.getValue ? properties.getValue() : properties;
  console.log('propertyValues: ', propertyValues);

  if (!propertyValues) {
    return {
      position: pickPosition,
      entity,
      type: 'popup'
    };
  }

  const { name, MineDesc, MineName } = propertyValues;
  const type = (name && MineName && MineDesc) ? 'operate' : 'popup';
  const position = getPos(entity, pickPosition) ?? pickPosition;

  return {
    position,
    entity,
    sourceTarget: propertyValues,
    type,
    content: createPickedFeatureDescription(propertyValues)
  };
}

/**
 * 处理右键实体拾取逻辑
 * @param {Object} pickedObject - 拾取的对象
 * @param {Cartesian3} position - 拾取位置
 * @returns {Object|null} 实体信息对象或null
 */
function handleRightClickEntityPick(pickedObject, position) {
  if (!(pickedObject.id instanceof Entity)) {
    return null;
  }

  const entity = pickedObject.id;
  const baseInfo = { position, entity };

  if (!entity.properties) {
    return { ...baseInfo, type: 'popup' };
  }

  const properties = entity.properties;
  const propertyValues = properties.getValue ? properties.getValue() : properties;

  if (!propertyValues) {
    return { ...baseInfo, type: 'popup' };
  }

  const { name, MineDesc, MineName } = propertyValues;

  // 检查是否是操作类型实体
  if (name && MineName && MineDesc) {
    getGroupCompanyContextmenuItems(name);
    return {
      ...baseInfo,
      sourceTarget: propertyValues,
      title: name,
      type: 'rightClickMenu'
    };
  }

  // 普通弹出窗口
  return {
    ...baseInfo,
    sourceTarget: propertyValues,
    type: 'popup'
  };
}

/**
 * 设置左键点击事件处理
 * 处理实体拾取、聚类缩放和属性显示
 */
export function leftClick() {
  const viewer = getViewer();
  if (!viewer) {
    console.warn('Cesium viewer not available for left click setup');
    return;
  }

  const scene = viewer.scene;

  viewer.screenSpaceEventHandler.setInputAction(function (movement) {
    try {
      // 重置活动实体
      activeEntityRef.value = null;

      const pickedObject = scene.pick(movement.position);
      if (!defined(pickedObject)) {
        return;
      }

      // 处理聚类实体
      if (pickedObject.id instanceof Array && pickedObject.id[0] instanceof Entity) {
        clusteringZoom(pickedObject.id);
        return;
      }

      // 处理单个实体
      const entityInfo = handleEntityPick(pickedObject, scene.pickPosition(movement.position), scene);
      if (entityInfo) {
        activeEntityRef.value = entityInfo;
      }
    } catch (error) {
      console.error('Error in left click handler:', error);
      activeEntityRef.value = null;
    }
  }, ScreenSpaceEventType.LEFT_CLICK);
}

/**
 * 设置右键点击事件处理
 * 处理上下文菜单、模型滑块等右键操作
 */
export function rightClick() {
  const viewer = getViewer();
  if (!viewer) {
    console.warn('Cesium viewer not available for right click setup');
    return;
  }

  const scene = viewer.scene;

  viewer.screenSpaceEventHandler.setInputAction(function (movement) {
    try {
      // 重置活动实体
      activeEntityRef.value = null;

      const pickedObject = scene.pick(movement.position);
      const position = scene.pickPosition(movement.position);

      if (!defined(pickedObject)) {
        // 没有拾取到任何对象，可以在这里处理空白区域的右键点击
        return;
      }

      // 处理实体
      if (pickedObject.id instanceof Entity) {
        const entityInfo = handleRightClickEntityPick(pickedObject, position);
        if (entityInfo) {
          activeEntityRef.value = entityInfo;
        }
      }
      // 处理3D瓦片集
      else if (pickedObject.primitive instanceof Cesium3DTileset) {
        console.log('Right clicked on Cesium3DTileset:', pickedObject.primitive);
        // 可以在这里添加3D瓦片集的右键菜单逻辑
      }
      // 处理模型
      else if (pickedObject.primitive instanceof Model) {
        activeEntityRef.value = {
          position,
          type: 'modelSlider',
          model: pickedObject.primitive
        };
      }
      // 其他类型的图元
      else if (pickedObject.primitive) {
        console.log('Right clicked on primitive:', pickedObject.primitive);
        // 可以在这里添加其他图元类型的处理逻辑
      }
    } catch (error) {
      console.error('Error in right click handler:', error);
      activeEntityRef.value = null;
    }
  }, ScreenSpaceEventType.RIGHT_CLICK);
}

const lastCamera = ref(null);
let heightStatus = false;
let postUpdateListener = null;

/**
 * 清理事件监听器
 */
function cleanupEventListeners() {
  if (postUpdateListener) {
    postUpdateListener();
    postUpdateListener = null;
  }
}

/**
 * 查询当前视野内的实体（优化版）
 * 使用 lodash-es 的防抖函数进行性能优化
 */
export function queryEntitiesInView(callback) {
  try {
    const _viewer = getViewer();
    if (!_viewer) return;

    // 清理之前的监听器
    cleanupEventListeners();

    // 使用 lodash-es 的防抖函数
    const debouncedCallback = lodashDebounce(() => {
      try {
        const { camera, scene } = _viewer;
        const currentTime = _viewer.clock.currentTime;

        // 相机几乎没动就跳过（性能优化关键）
        if (Matrix4.equalsEpsilon(scene.camera.viewMatrix, lastCamera, CesiumMath.EPSILON4)) {
          return;
        }
        Matrix4.clone(scene.camera.viewMatrix, lastCamera);

        // 执行回调
        callback && callback();

        const entities = _viewer.dataSources.length
          ? _viewer.dataSources.get(0).entities.values
          : [];

        // 批量处理实体可见性
        let visibleCount = 0;
        entities.forEach(entity => {
          if (!entity.position) return;

          const pos = entity.position.getValue(currentTime);
          if (!pos) return;

          const inView = isPositionInFrustum(pos, scene);

          // 只在状态变化时修改 show（性能优化）
          if (entity.show !== inView) {
            entity.show = inView;
          }

          if (inView) {
            visibleCount++;
          }
        });

        // 获取相机高度和视野范围
        const height = camera.positionCartographic.height;
        const rectangle = camera.computeViewRectangle(scene.globe.ellipsoid, new Rectangle());

        if (!rectangle) return;

        const west = CesiumMath.toDegrees(rectangle.west);
        const south = CesiumMath.toDegrees(rectangle.south);
        const east = CesiumMath.toDegrees(rectangle.east);
        const north = CesiumMath.toDegrees(rectangle.north);

        // 根据高度处理不同逻辑
        if (height <= HEIGHT_THRESHOLD_LOW && !heightStatus) {
          heightStatus = true;
          // 这里可以添加根据高度加载不同模型的逻辑
        } else if (height > HEIGHT_THRESHOLD_HIGH && heightStatus) {
          heightStatus = false;
        }

        // 调试信息
        if (process.env.NODE_ENV === 'development') {
          console.debug(`Visible entities: ${visibleCount}/${entities.length}, Height: ${height.toFixed(0)}m`);
        }
      } catch (error) {
        console.error('Error in debounced query:', error);
      }
    }, DEBOUNCE_DELAY, {
      leading: false,  // 不立即执行
      trailing: true   // 延迟结束后执行
    });

    // 添加事件监听器
    postUpdateListener = _viewer.scene.postUpdate.addEventListener(debouncedCallback);

    // 在组件卸载时清理
    onUnmounted(() => {
      cleanupEventListeners();
      // 取消防抖函数的待执行调用
      debouncedCallback.cancel && debouncedCallback.cancel();
    });

  } catch (error) {
    console.error('Error setting up queryEntitiesInView:', error);
  }
}

/**
 * 清理所有事件监听器和资源
 */
export function cleanupOnEvents() {
  cleanupEventListeners();
  activeEntityRef.value = null;
  lastCamera.value = null;
  heightStatus = false;
}

