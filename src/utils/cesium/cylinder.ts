import { unref, watch } from 'vue';
import {
  Cartesian3,
  VerticalOrigin,
  Color as CesiumColor,
  sampleTerrainMostDetailed,
  Cartographic,
  Cartesian2,
  ArcType,
  HorizontalOrigin,
  ColorMaterialProperty,
  CallbackProperty,
  Math as CesiumMath,
} from 'cesium';

import { getLabelConfig, LABEL_PRESETS } from './labelConfig';
import { getGroundHole } from '../mqtt/publish';
import { useGroupCompanyLevelMine } from '@/components/GroupAndCompany/src/hooks/useGroupCompanyLevelMine';
import { getViewer, clearEntityArray, addEntities } from './helpers';
import { CYLINDER_CONFIG } from './constants';

const { getGroundHoleGeoJSON } = useGroupCompanyLevelMine();

// 钻孔实体存储
const groundHoleEntities: any[] = [];

// 停止监听器映射
const stopMap = new Map();

/**
 * 清理所有钻孔实体
 */
function clearGroundHole() {
  clearEntityArray(groundHoleEntities);
}

/**
 * 加载矿井钻孔数据
 * @param {Object} mine - 矿井对象
 * @param {boolean} is - 是否加载
 * @example
 * loadMineGroundHole(mineData, true);
 */
export function loadMineGroundHole(mine, is) {
  console.log('loadMineGroundHole: ', mine.name);

  // 清理现有实体
  clearGroundHole();

  // 停止之前的监听器
  if (stopMap.has(mine.name)) {
    stopMap.get(mine.name)();
    stopMap.delete(mine.name);
  }

  if (!is) return;

  // 获取钻孔数据
  getGroundHole(mine.name);

  // 监听数据变化
  const stop = watch(
    () => unref(getGroundHoleGeoJSON),
    (newVal) => {
      console.log('getGroundHoleGeoJSON: ', newVal);
      if (newVal) {
        terrainGroundHole(newVal);
      }
    }
  );

  stopMap.set(mine.name, stop);
}

/**
 * 处理地形钻孔数据
 * @param {Object} groundHole - GeoJSON 格式的钻孔数据
 */
function terrainGroundHole(groundHole) {
  console.log('Processing ground hole data: ', groundHole);

  const { features } = groundHole;
  if (!features || features.length === 0) return;

  // 提取所有坐标点用于地形采样
  const positions = features.map(feature => {
    const { coordinates } = feature.geometry;
    return Cartographic.fromDegrees(coordinates[0], coordinates[1]);
  });

  const viewer = getViewer();
  if (!viewer || !viewer.terrainProvider) {
    console.error('Viewer or terrain provider not available');
    return;
  }

  // 采样地形高度
  const terrainPromise = sampleTerrainMostDetailed(viewer.terrainProvider, positions);

  terrainPromise.then(updatedPositions => {
    features.forEach((feature, index) => {
      createBoreholeEntity(feature, updatedPositions[index].height, viewer);
    });
  }).catch(error => {
    console.error('Error sampling terrain:', error);
  });
}

/**
 * 创建单个钻孔实体
 * @param {Object} feature - GeoJSON 特征
 * @param {number} terrainHeight - 地形高度
 * @param {Cesium.Viewer} viewer - Cesium viewer 实例
 */
function createBoreholeEntity(feature, terrainHeight, viewer) {
  const { properties: props, geometry } = feature;
  const { coordinates } = geometry;

  const totalDepth = props.depth || 1; // 钻孔深度（米）
  const centerHeight = terrainHeight - totalDepth / 2;

  // 创建钻孔圆柱体实体
  const boreholeEntity = {
    id: `borehole_${props.id}`,
    name: props.name || props.label,
    position: Cartesian3.fromDegrees(coordinates[0], coordinates[1], centerHeight),
    cylinder: {
      length: totalDepth,
      topRadius: CYLINDER_CONFIG.DEFAULT_RADIUS,
      bottomRadius: CYLINDER_CONFIG.DEFAULT_RADIUS,
      material: CesiumColor.DIMGRAY.withAlpha(CYLINDER_CONFIG.DEFAULT_MATERIAL_ALPHA),
      outline: true,
      outlineColor: CesiumColor.BLACK.withAlpha(CYLINDER_CONFIG.DEFAULT_OUTLINE_ALPHA),
      outlineWidth: CYLINDER_CONFIG.DEFAULT_OUTLINE_WIDTH,
    },
    properties: props,
  };

  // 创建地面标签实体
  const labelEntity = {
    id: `label_${props.id}`,
    position: Cartesian3.fromDegrees(coordinates[0], coordinates[1], terrainHeight + 5),
    billboard: {
      scale: 0.8,
      verticalOrigin: VerticalOrigin.BOTTOM,
    },
    label: {
      text: props.label || props.name,
      verticalOrigin: VerticalOrigin.BOTTOM,
      pixelOffset: new Cartesian2(0, -10),
      ...getLabelConfig(LABEL_PRESETS.NORMAL),
    },
    properties: props,
  };

  // 批量添加实体
  const addedEntities = addEntities([boreholeEntity, labelEntity], viewer);
  groundHoleEntities.push(...addedEntities);

  // 创建刻度尺
  createIntervalScale(coordinates, terrainHeight, totalDepth, viewer);
}

/**
 * 创建刻度线实体
 * @param {Cartesian3} leftPos - 左侧位置
 * @param {Cartesian3} rightPos - 右侧位置
 * @param {Cesium.Viewer} viewer - Cesium viewer 实例
 */
function createIntervalScaleLine(leftPos, rightPos, viewer) {
  const lineEntity = {
    polyline: {
      positions: [leftPos, rightPos],
      width: 1.5,
      material: new ColorMaterialProperty(
        new CallbackProperty(() => {
          const dist = Cartesian3.distance(viewer.camera.position, rightPos);
          const alpha = CesiumMath.clamp(1 - (dist - 800) / 3500, 0, 1);
          return new CesiumColor(105, 105, 105, alpha); // 远距离渐隐
        }, false)
      ),
      arcType: ArcType.NONE,
    },
  };

  const addedEntity = addEntities([lineEntity], viewer);
  groundHoleEntities.push(...addedEntity);
}

/**
 * 创建刻度标签实体
 * @param {Cartesian3} position - 标签位置
 * @param {number} height - 高度值
 * @param {Cesium.Viewer} viewer - Cesium viewer 实例
 */
function createIntervalScaleLabel(position, height, viewer) {
  const labelEntity = {
    position: position,
    label: {
      text: `${height} m`,
      verticalOrigin: VerticalOrigin.CENTER,
      horizontalOrigin: HorizontalOrigin.LEFT,
      eyeOffset: new Cartesian3(0, 0, -6),
      ...getLabelConfig(LABEL_PRESETS.DEPTH),
    },
  };

  const addedEntity = addEntities([labelEntity], viewer);
  groundHoleEntities.push(...addedEntity);
}

/**
 * 创建钻孔刻度尺
 * @param {number[]} coord - 坐标数组 [longitude, latitude]
 * @param {number} terrainHeight - 地形高度
 * @param {number} totalDepth - 总深度
 * @param {Cesium.Viewer} viewer - Cesium viewer 实例
 */
function createIntervalScale(coord, terrainHeight, totalDepth, viewer) {
  const interval = 20; // 刻度间隔（米）
  const WEST_OFFSET = 0.00001; // 向西偏移量
  const EAST_OFFSET = 0.0001;  // 向东偏移量

  /**
   * 创建坐标点
   * @param {number} longitudeOffset - 经度偏移
   * @param {number} altitude - 海拔高度
   * @returns {Cartesian3} 坐标点
   */
  const createPosition = (longitudeOffset, altitude) => {
    return Cartesian3.fromDegrees(
      coord[0] + longitudeOffset,
      coord[1],
      altitude
    );
  };

  // 创建主要刻度
  for (let depth = interval; depth <= totalDepth - interval; depth += interval) {
    const currentHeight = terrainHeight - depth;
    const leftPos = createPosition(WEST_OFFSET, currentHeight);
    const rightPos = createPosition(EAST_OFFSET, currentHeight);

    createIntervalScaleLine(leftPos, rightPos, viewer);
    createIntervalScaleLabel(rightPos, depth, viewer);
  }

  // 创建底部刻度（总深度处）
  const finalHeight = terrainHeight - totalDepth;
  const leftPos = createPosition(WEST_OFFSET, finalHeight);
  const rightPos = createPosition(EAST_OFFSET, finalHeight);

  createIntervalScaleLine(leftPos, rightPos, viewer);
  createIntervalScaleLabel(rightPos, totalDepth, viewer);
}
