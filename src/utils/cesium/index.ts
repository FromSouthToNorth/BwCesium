import { unref, toRaw, ref, computed } from 'vue';
import {
  defined,
  Math as CesiumMath,
  ReferenceFrame,
  Cartographic,
  Cartesian2,
  Cartesian3,
  SceneTransforms,
  Rectangle,
  JulianDate,
  Ion,
  Viewer,
  ImageryLayer,
  UrlTemplateImageryProvider,
  WebMercatorTilingScheme,
  ClippingPolygonCollection,
  Terrain,
} from 'cesium';

import CesiumNavigation from 'cesium-navigation-es6';

import { groupCompanyLevelMine } from '@/utils/mqtt/publish';
import { useCesiumStore } from '@/store/modules/cesiumStore';
import { turfPolygon, turfBbox } from '../turf';
import { isArray } from '../is';

// 导入辅助函数和常量
import { safeCesiumOperation } from './helpers';
import { MAP_CONFIG, FLY_TO_CONFIG, GEOMETRY_CONFIG } from './constants';
import { computeGeometricCenter, cartesianToDegrees, bboxToRectangle } from './utils';
import { leftClick, rightClick, queryEntitiesInView } from './on';

// 导出其他模块的函数
export { createIconMarker, buildLabel } from './icon';
export { translateModel, loadMineTunnelModel } from './model';
export { getActiveEntity } from './on';
export { setupClustering } from './clustering';
export { geoJSONPointLoad, loadMineDevicePoint, loadMineTunnel } from './geojson';
export { traverseBoundaryClipping } from './clipping';
export { loadMineGroundHole } from './cylinder';
export { loaMineWaterArea } from './waterArea';
export { getViewer } from './helpers'

// 导出高程控制模块
export * from './elevation';

// 使用常量配置
Ion.defaultAccessToken = MAP_CONFIG.ION_TOKEN;
const mapTileKey = MAP_CONFIG.MAP_TILE_KEY;

// Vue 响应式引用
const terrainRef = ref<any>(null);

/**
 * 地形加载完成回调
 */
function handleTerrainReady() {
  const terrain = toRaw(unref(terrainRef));
  if (terrain && terrain.readyEvent) {
    terrain.readyEvent.addEventListener((terr) => {
      console.log('-----地形加载完成----- ', terr);
      groupCompanyLevelMine();
    });
  }
}

/**
 * 初始化 Cesium Viewer
 * @param {HTMLElement} refEl - 容器元素
 * @returns {Cesium.Viewer} viewer 实例(同时已写入 cesiumStore,可用 getViewer 获取)
 * @example
 * const viewer = initializeCesium(document.getElementById('cesiumContainer'));
 */
export function initializeCesium(refEl) {
  // 创建 Viewer 实例
  const viewer = new Viewer(refEl, {
    timeline: false,
    animation: false,
    shouldAnimate: true,
    baseLayerPicker: true,
  });

  // 配置地图瓦片
  const tileProvider = new UrlTemplateImageryProvider({
    url: `/BwMap/tiles/{z}/{x}/{y}.png?access_token=${mapTileKey}`,
    tilingScheme: new WebMercatorTilingScheme(),
    maximumLevel: 16,
  });

  // 配置场景
  const scene = viewer.scene;
  terrainRef.value = Terrain.fromWorldTerrain();
  const terrain = toRaw(unref(terrainRef));
  scene.setTerrain(terrain);

  // 配置地球
  const globe = scene.globe;
  globe.translucency.enabled = true;
  globe.depthTestAgainstTerrain = true;
  globe.clippingPolygons = new ClippingPolygonCollection();

  // 添加图层和导航
  viewer.imageryLayers.add(new ImageryLayer(tileProvider));
  new (CesiumNavigation as any)(viewer);

  // 存储到 store
  const cesiumStore = useCesiumStore();
  cesiumStore.setViewer(viewer);

  // 初始化事件监听
  queryEntitiesInView();
  handleTerrainReady();
  leftClick();
  rightClick();

  return viewer;
}

/**
 * 飞行到边界或指定坐标
 * @param {Object} options - 飞行选项
 * @param {Array} [options.boundary] - 边界坐标数组
 * @param {number} [options.L] - 经度
 * @param {number} [options.B] - 纬度
 * @param {number} [options.pad] - 边界填充
 * @param {Object} [options.orientation] - 相机方向
 * @param {Function} [complete] - 完成回调
 * @example
 * flyToBoundary({ boundary: [[lng1, lat1], [lng2, lat2]] });
 * flyToBoundary({ L: 116.397, B: 39.908 });
 */
export function flyToBoundary(options: any, complete?) {
  let { boundary, L, B, pad, orientation } = options
  return safeCesiumOperation((viewer) => {
    let destination;

    if (isArray(boundary) && boundary.length > 0) {
      pad = pad || FLY_TO_CONFIG.DEFAULT_PAD;
      const bbox = turfBbox(turfPolygon({ coordinates: [boundary] }));
      destination = Rectangle.fromDegrees(
        bbox[0] - pad,
        bbox[1] - pad,
        bbox[2] + pad,
        bbox[3] + pad
      );
    } else {
      destination = Cartesian3.fromDegrees(L, B, FLY_TO_CONFIG.DEFAULT_HEIGHT);
    }

    viewer.camera.flyTo({
      destination,
      duration: FLY_TO_CONFIG.DEFAULT_DURATION,
      orientation,
      complete,
    });
  }, '飞行到边界失败');
}

/**
 * 获取 Entity 当前的屏幕像素坐标（左上角为原点）
 * @param {Cesium.Entity} entity - Cesium 实体
 * @param {Cesium.Viewer} viewer - Cesium viewer 实例
 * @param {Cesium.Cartesian2} [result] - 可选，避免重复创建对象
 * @returns {Cesium.Cartesian2 | null} 屏幕坐标或 null（被背面裁剪、不可见时）
 * @example
 * const screenPos = getEntityScreenPosition(entity, viewer);
 */
export function getEntityScreenPosition(entity, viewer, result = new Cartesian2()) {
  if (!entity || !entity.position) return null;

  // 获取实时的笛卡尔坐标
  const worldPos = entity.position.getValue(viewer.clock.currentTime);
  if (!defined(worldPos)) return null;

  // 世界坐标 → 屏幕坐标
  const screenPos = SceneTransforms.worldToWindowCoordinates(
    viewer.scene,
    worldPos,
    result
  );

  return screenPos || null;
}

/**
 * 获取 Entity 当前的经纬度（高度包含）
 * @param {Cesium.Entity} entity - Cesium 实体
 * @param {Cesium.Viewer} viewer - Cesium viewer 实例
 * @returns {{longitude: number, latitude: number, height: number} | null} 经纬度坐标或 null
 * @example
 * const position = getEntityPosition(entity, viewer);
 */
export function getEntityPosition(entity, viewer) {
  if (!entity || !entity.position) return null;

  let positionCart;

  // 统一取值方式
  if (defined(entity.position.getValue)) {
    positionCart = entity.position.getValue(viewer.clock.currentTime);
  } else if (defined(entity.position.getValueInReferenceFrame)) {
    positionCart = entity.position.getValueInReferenceFrame(
      viewer.clock.currentTime,
      ReferenceFrame.FIXED
    );
  } else {
    return null;
  }

  if (!defined(positionCart)) return null;

  // 转换为经纬度
  const cartographic = Cartographic.fromCartesian(positionCart);
  const longitude = CesiumMath.toDegrees(cartographic.longitude);
  const latitude = CesiumMath.toDegrees(cartographic.latitude);
  const height = cartographic.height;

  return {
    longitude: Number(longitude.toFixed(6)),
    latitude: Number(latitude.toFixed(6)),
    height: Number(height.toFixed(2)),
  };
}

/**
 * 将 Cesium Entity 数组或 EntityCollection 转换为 GeoJSON FeatureCollection
 * @param {Cesium.Entity[] | Cesium.EntityCollection} entities - 要转换的实体
 * @param {boolean} [includeProperties=true] - 是否包含自定义属性
 * @returns {Object} GeoJSON FeatureCollection 对象
 * @example
 * const geojson = entitiesToGeoJSON(entities);
 */
export function entitiesToGeoJSON(entities, includeProperties = true) {
  const features: any[] = [];
  // 统一处理为数组
  const entityArray = isArray(entities) ? entities : entities.values;
  const now = JulianDate.now();

  entityArray.forEach((entity) => {
    const feature: any = {
      type: 'Feature',
      geometry: null,
      properties: includeProperties ? {} : null,
    };

    let geometrySet = false;

    // Point 几何
    if (entity.position) {
      const cartesian = entity.position.getValue(now);
      if (cartesian) {
        const cartographic = Cartographic.fromCartesian(cartesian);
        feature.geometry = {
          type: 'Point',
          coordinates: [
            CesiumMath.toDegrees(cartographic.longitude),
            CesiumMath.toDegrees(cartographic.latitude),
            cartographic.height || 0,
          ],
        };
        geometrySet = true;
      }
    }
    // LineString 几何
    else if (entity.polyline && entity.polyline.positions) {
      const positions = entity.polyline.positions.getValue(now);
      if (positions && positions.length > 1) {
        const coords = positions.map((pos) => {
          const c = Cartographic.fromCartesian(pos);
          return [
            CesiumMath.toDegrees(c.longitude),
            CesiumMath.toDegrees(c.latitude),
            c.height || 0,
          ];
        });
        feature.geometry = { type: 'LineString', coordinates: coords };
        geometrySet = true;
      }
    }
    // Polygon 几何
    else if (entity.polygon && entity.polygon.hierarchy) {
      const hierarchy = entity.polygon.hierarchy.getValue(now);
      if (hierarchy && hierarchy.positions.length >= 3) {
        const positions = hierarchy.positions;
        const coords = positions.map((pos) => {
          const c = Cartographic.fromCartesian(pos);
          return [CesiumMath.toDegrees(c.longitude), CesiumMath.toDegrees(c.latitude)];
        });
        coords.push(coords[0]); // 闭合环
        feature.geometry = { type: 'Polygon', coordinates: [coords] };
        geometrySet = true;
      }
    }

    // 如果没有几何体，跳过
    if (!geometrySet) return;

    // 提取属性
    if (includeProperties && feature.properties) {
      const props = feature.properties;

      // 从 entity.properties 获取
      if (entity.properties) {
        const propValue = entity.properties.getValue(now);
        if (propValue && typeof propValue === 'object') {
          Object.assign(props, propValue);
        }
      }

      // 常用字段
      if (entity.name) props.name = entity.name;
      if (entity.description) {
        const desc = entity.description.getValue(now);
        if (desc) props.description = desc;
      }

      // billboard 图标路径
      if (entity.billboard && entity.billboard.image) {
        const image = entity.billboard.image.getValue(now);
        if (image) props.icon = image;
      }

      // label 文本
      if (entity.label && entity.label.text) {
        const text = entity.label.text.getValue(now);
        if (text) props.label = text;
      }

      // 其他样式
      if (entity.billboard && entity.billboard.scale) {
        props.scale = entity.billboard.scale.getValue(now);
      }
    }

    features.push(feature);
  });

  return {
    type: 'FeatureCollection',
    features: features,
  };
}

/**
 * 飞行到指定目的地
 * @param {Cesium.Rectangle | Cesium.Cartesian3} destination - 目的地
 * @param {Function} [complete] - 完成回调
 * @example
 * flyTo(rectangle);
 * flyTo(cartesian3);
 */
export function flyTo(destination, complete?) {
  return safeCesiumOperation((viewer) => {
    viewer.camera.flyTo({
      destination,
      duration: FLY_TO_CONFIG.DEFAULT_DURATION,
      complete,
    });
  }, '飞行失败');
}

/**
 * 销毁 Cesium Viewer 实例
 * 该函数负责安全地销毁 Cesium Viewer 实例并清理相关资源
 * @returns {void}
 */
export function destroyCesium() {
  const cesiumStore = useCesiumStore();
  const viewer = toRaw(unref(cesiumStore.viewer));
  console.log('Destroying Cesium viewer: ', viewer);

  if (!viewer) return;

  // 防止重复销毁
  if (viewer.isDestroyed?.()) {
    cesiumStore.setViewer(null);
    return;
  }

  try {
    viewer.isDestroyed() || viewer.destroy();
  } catch (e: any) {
    console.warn('Cesium destroy 过程出现异常:', e);
  } finally {
    cesiumStore.setViewer(null);
    console.log('Cesium Viewer destroyed');
  }
}

/**
 * 计算折线的几何中心点
 * @param {Cartesian3[]} positions - 折线顶点数组
 * @param {number} [heightOffset] - 高度偏移量，默认为 GEOMETRY_CONFIG.DEFAULT_HEIGHT_OFFSET
 * @returns {Cartesian3|undefined} 几何中心点坐标
 * @example
 * const center = getPolylineGeometricCenter(positions, 10);
 */
export function getPolylineGeometricCenter(positions, heightOffset = GEOMETRY_CONFIG.DEFAULT_HEIGHT_OFFSET) {
  const center = computeGeometricCenter(positions);

  if (!center) return undefined;

  // 抬高（最常见做法）
  if (heightOffset !== 0) {
    const carto = Cartographic.fromCartesian(center);
    carto.height += heightOffset;
    return Cartographic.toCartesian(carto);
  }

  return center;
}
