import { unref, watch } from 'vue';
import {
  Material,
  buildModuleUrl,
  GeoJsonDataSource,
  Color as CesiumColor,
  Cartesian2,
  Primitive,
  PolygonGeometry,
  GeometryInstance,
  EllipsoidSurfaceAppearance,
  Cartographic,
  Math as CesiumMath,
  Cartesian3,
  HorizontalOrigin,
  VerticalOrigin,
} from 'cesium';

import { turfCentroid, turfPolygon } from '@/utils/turf';
import { getWaterArea } from '../mqtt/publish';
import { useGroupCompanyLevelMine } from '@/components/GroupAndCompany/src/hooks/useGroupCompanyLevelMine';
import { getViewer, addEntities, removeEntities } from './helpers';
import { getLabelConfig, LABEL_PRESETS } from './labelConfig';
import { WATER_AREA_CONFIG } from './constants';

const { getWaterAreaGeoJSON } = useGroupCompanyLevelMine();

// 水域图元存储
const waterPrimitives = [];

// 水域标签实体存储
const waterLabelEntities = [];

// 停止监听器映射
const stopMap = new Map();

/**
 * 清理所有水域图元和标签
 */
export function clearWater() {
  // 移除所有图元
  const viewer = getViewer();
  if (viewer) {
    waterPrimitives.forEach(primitive => {
      viewer.scene.primitives.remove(primitive);
    });
  }
  waterPrimitives.length = 0;

  // 移除所有标签实体
  removeEntities(waterLabelEntities);
  waterLabelEntities.length = 0;
}

/**
 * 加载矿井水域数据
 * @param {Object} mine - 矿井对象
 * @param {boolean} is - 是否加载
 * @example
 * loaMineWaterArea(mineData, true);
 */
export function loaMineWaterArea(mine, is) {
  console.log('Loading mine water area: ', mine.name);

  // 清理现有水域
  clearWater();

  // 停止之前的监听器
  if (stopMap.has(mine.name)) {
    stopMap.get(mine.name)();
    stopMap.delete(mine.name);
  }

  if (!is) return;

  // 获取水域数据
  getWaterArea(mine.name);

  // 监听数据变化
  const stopWatch = watch(
    () => unref(getWaterAreaGeoJSON),
    (newVal) => {
      console.log('Water area data received: ', newVal);
      if (newVal) {
        createWaterArea(newVal);
      }
    }
  );

  stopMap.set(mine.name, stopWatch);
}

/**
 * 创建水域图元和标签
 * @param {Object} geojson - GeoJSON 格式的水域数据
 */
function createWaterArea(geojson) {
  GeoJsonDataSource.load(geojson)
    .then((dataSource) => {
      dataSource.entities.values.forEach((entity, index) => {
        createWaterPrimitive(entity);
      });
    })
    .catch((error) => {
      console.error('Error loading water area GeoJSON:', error);
    });
}

/**
 * 创建单个水域图元和标签
 * @param {Cesium.Entity} entity - GeoJSON 数据源实体
 */
function createWaterPrimitive(entity) {
  const viewer = getViewer();
  if (!viewer) {
    console.error('Viewer not available');
    return;
  }

  // 提取多边形顶点坐标
  const hierarchy = entity.polygon?.hierarchy?.getValue();
  if (!hierarchy || !hierarchy.positions) {
    console.warn('Invalid polygon hierarchy');
    return;
  }

  const positions = hierarchy.positions.map((position) => {
    const cartographic = Cartographic.fromCartesian(position);
    return [
      CesiumMath.toDegrees(cartographic.longitude),
      CesiumMath.toDegrees(cartographic.latitude),
    ];
  });

  // 获取属性
  const properties = entity.properties?.getValue() || {};
  const { height = WATER_AREA_CONFIG.DEFAULT_HEIGHT, lower, name = '水域' } = properties;

  // 创建水域图元
  const waterPrimitive = new Primitive({
    geometryInstances: new GeometryInstance({
      geometry: new PolygonGeometry({
        height,
        polygonHierarchy: hierarchy,
      }),
    }),
    appearance: new EllipsoidSurfaceAppearance({
      material: new Material({
        fabric: {
          type: 'Water',
          uniforms: {
            normalMap: buildModuleUrl('Assets/Textures/waterNormals.jpg'),
            frequency: 1000,
            animationSpeed: 0.01,
            amplitude: 10,
          },
        },
      }),
    }),
  });

  // 添加自定义属性
  waterPrimitive.properties = properties;

  // 计算中心点
  const center = turfCentroid(turfPolygon({ coordinates: [positions] }));

  const centerPosition = Cartesian3.fromDegrees(center[0], center[1], height);

  waterPrimitive.center = centerPosition;

  // 添加到场景
  viewer.scene.primitives.add(waterPrimitive);
  waterPrimitives.push(waterPrimitive);

  // 创建标签
  createWaterLabel(centerPosition, name, properties, viewer);
}

/**
 * 创建水域标签
 * @param {Cartesian3} position - 标签位置
 * @param {string} name - 水域名称
 * @param {Object} properties - 水域属性
 * @param {Cesium.Viewer} viewer - Cesium viewer 实例
 */
function createWaterLabel(position, name, properties, viewer) {
  const labelEntity = {
    position: position,
    label: {
      text: name,
      horizontalOrigin: HorizontalOrigin.CENTER,
      verticalOrigin: VerticalOrigin.CENTER,
      pixelOffset: new Cartesian2(0, -10),
      eyeOffset: new Cartesian3(0, 0, -60),
      ...getLabelConfig(LABEL_PRESETS.WATER),
    },
    properties: properties,
  };

  const addedEntity = addEntities([labelEntity], viewer);
  waterLabelEntities.push(...addedEntity);
}

/**
 * 获取所有水域图元
 * @returns {Primitive[]} 水域图元数组
 */
export function getWaterPrimitives() {
  return [...waterPrimitives];
}

/**
 * 获取所有水域标签实体
 * @returns {Cesium.Entity[]} 水域标签实体数组
 */
export function getWaterLabelEntities() {
  return [...waterLabelEntities];
}

/**
 * 根据名称查找水域图元
 * @param {string} name - 水域名称
 * @returns {Primitive|undefined} 找到的水域图元
 */
export function findWaterPrimitiveByName(name) {
  return waterPrimitives.find(primitive =>
    primitive.properties?.name === name
  );
}

/**
 * 更新水域高度
 * @param {string} name - 水域名称
 * @param {number} newHeight - 新的高度
 * @returns {boolean} 是否更新成功
 */
export function updateWaterHeight(name, newHeight) {
  const primitive = findWaterPrimitiveByName(name);
  if (!primitive) {
    console.warn(`Water primitive not found: ${name}`);
    return false;
  }

  // 注意：Primitive 的高度更新需要重新创建图元
  // 这里只是示例，实际实现可能需要更复杂的逻辑
  console.log(`Updating water height for ${name} to ${newHeight}`);
  return true;
}
