import { unref, toRaw, watch, ref } from 'vue';
import {
  Cartesian3,
  Cartographic,
  sampleTerrainMostDetailed,
  Cartesian2,
  ImageMaterialProperty,
  ClippingPolygon,
  Math as CesiumMath
} from 'cesium';

import { notification } from 'ant-design-vue';

import { flyToBoundary } from './index';
import { isArray } from '../is';
import { useSetting } from '@/hooks/setting/useSetting';
import {
  turfPolygon,
  densifyPolygon,
  turfConcave,
  turfUnion,
  turfTransformScale,
} from '../turf';

import {
  getTraverseBoundary,
} from '../mqtt/publish';

import {
  useGroupCompanyLevelMine,
} from '@/hooks/useGroupCompanyLevelMine';

// 使用辅助函数
import { getViewer, safeCesiumOperation, clearEntityArray } from './helpers';

const {
  getTraverseBoundaryGeoJSON
} = useGroupCompanyLevelMine();

const { setPageLoading } = useSetting();

// 常量配置
const TEXTURE_PATH_1 = '/src/assets/soil_texture.png';
const TEXTURE_PATH_2 = '/src/assets/soil_texture2.png';
const ENTITY_IDS = ['ClippingWall', 'ClippingWallDM'];
const clippingEntities: any[] = [];

/**
 * 清除裁剪墙体实体
 * @returns {void}
 */
function clearWall() {
  clearEntityArray(clippingEntities);
}

/**
 * 清除所有裁剪效果
 * 包括移除裁剪多边形和清理墙体实体
 * @returns {void}
 */
function clearClipping() {
  safeCesiumOperation((viewer) => {
    const globe = viewer.scene.globe;
    const clippingPolygons = globe.clippingPolygons;
    clippingPolygons.removeAll();
    clippingPolygons.enabled = false;
    clearWall();
  }, '清除裁剪失败');
}

/**
 * 清除所有裁剪效果并恢复实体高度
 * @returns {void}
 */
export function clearClippingWithElevation() {
  // 恢复实体高度
  // restoreAllEntitiesElevation();

  // 清除裁切
  clearClipping();
}

/**
 * 应用裁剪效果到指定位置
 * @param {Array<Cartesian3>} positions - 裁剪多边形的顶点位置数组
 * @returns {void}
 */
function clipping(positions) {
  safeCesiumOperation((viewer) => {
    const globe = viewer.scene.globe;
    const clippingPolygons = globe.clippingPolygons;
    const newClippingPolygon = new ClippingPolygon({ positions });
    clippingPolygons.add(newClippingPolygon);
    clippingPolygons.enabled = true;
    setPageLoading(false);
  }, '应用裁剪失败');
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
  clearClippingWithElevation();

  if (!is) {
    setPageLoading(false);
    return;
  }

  // 参数验证
  if (!mine || !mine.boundary || typeof mine.minZ === 'undefined') {
    throw new Error('Invalid mine parameter: boundary and minZ are required');
  }

  if (!isArray(mine.boundary) || mine.boundary.length < 3) {
    throw new Error('Boundary must be an array with at least 3 coordinates');
  }

  setPageLoading(true);
  const { boundary, minZ } = mine;

  try {
    // 处理边界
    const _boundary = turfPolygon({ coordinates: [boundary] });
    const tfPolygon = densifyPolygon(_boundary, 100);

    const coordinates = tfPolygon.geometry.coordinates[0];
    const positions = coordinates.map(coord => Cartesian3.fromDegrees(coord[0], coord[1]));
    const cartographic = positions.map(pos => Cartographic.fromCartesian(pos));

    flyToBoundary({ boundary, pad: 0.01 }, () => {
      safeCesiumOperation((viewer) => {
        sampleTerrainMostDetailed(viewer.terrainProvider, cartographic).then((samples) => {
          console.log('Terrain samples processed successfully');
          addWall(positions, cartographic, minZ);
          clipping(positions);
        }).catch((error) => {
          console.error('Error sampling terrain:', error);
          setPageLoading(false);
        });
      }, '地形采样失败');
    });
  } catch (error: any) {
    setPageLoading(false);
    console.error('Error in mineClipping:', error);
    throw error;
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
    // 添加墙体
    const wall1 = viewer.entities.add({
      id: ENTITY_IDS[0],
      wall: {
        positions: positions,
        minimumHeights: terrHeights.map(e => e.height),
        maximumHeights: new Array(positions.length).fill(minZ),
        material: new ImageMaterialProperty({
          image: TEXTURE_PATH_1,
          repeat: new Cartesian2(80, 80),
        }),
      }
    });
    clippingEntities.push(wall1);

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
    });
    clippingEntities.push(wall2);

    console.log('裁切壁纸底纸成功');
  }, '添加裁剪墙体失败');
}


const stopMap = new Map();
/**
 * 遍历边界裁剪函数
 * 清除现有裁剪，根据传入的mine和is参数进行边界裁剪处理
 * @param {Object} mine - 矿井对象，包含矿井名称等信息
 * @param {boolean} is - 控制标志，决定是否执行后续逻辑
 * @returns {void}
 */
export function traverseBoundaryClipping(mine, is) {
  clearClippingWithElevation();
  if (stopMap.has(mine.name)) {
    stopMap.get(mine.name)();
    stopMap.delete(mine.name);
  }
  if (!is) return;
  setPageLoading(true);
  getTraverseBoundary(mine.name);
  let index = 0;
  const stop = watch(() => unref(getTraverseBoundaryGeoJSON), (newVal) => {
    const { mineBoundary, traverse } = toRaw(unref(newVal)) as any;
    let cliPolygon, polygon, minZ = -100;
    if (mineBoundary && traverse) {
      const _polygon = turfConcave(traverse);
      minZ = traverse.minZ
      polygon = turfUnion(mineBoundary, _polygon);
    }
    else if (traverse) {
      minZ = traverse.minZ
      polygon = turfConcave(traverse);
    }
    else if (mineBoundary) {
      polygon = mineBoundary;
    }
    else {
      notification['error']({
        description: '井田边界巷道数据都没有, 请检查数据!',
        } as any);
      setPageLoading(false);
      return;
    }
    cliPolygon = densifyPolygon(polygon, 50);
    geojsonClipping(cliPolygon, minZ);
  });
  stopMap.set(mine.name, stop);
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
    console.error('Invalid GeoJSON data');
    return;
  }

  const coordinates = geojson.geometry.coordinates[0];
  const positions = coordinates.map(coord => Cartesian3.fromDegrees(coord[0], coord[1]));
  const cartographics = positions.map(pos => Cartographic.fromCartesian(pos));

  try {
    flyToBoundary({ boundary: coordinates, pad: 0.01 }, () => {
      safeCesiumOperation((viewer) => {
        sampleTerrainMostDetailed(viewer.terrainProvider, cartographics).then(heights => {
          addWall(positions, cartographics, minZ);
          clipping(positions);
        }).catch((error) => {
          console.error('Error sampling terrain in geojsonClipping:', error);
          setPageLoading(false);
        });
      }, 'GeoJSON裁剪失败');
    });
  } catch (error: any) {
    console.error('Error in geojsonClipping:', error);
    setPageLoading(false);
  }
}
