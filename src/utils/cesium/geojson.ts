declare const Cesium: any

import { unref, toRaw, watch } from 'vue';
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
} from 'cesium';

import {
  getDevicePoint,
  getTunnelLineString
} from '../mqtt/publish';

import {
  turfPolygon,
  densifyPolygon,
  turfConvex,
  turfUnion,
} from '../turf';

import {
  setupClustering,
  createIconMarker,
  getPolylineGeometricCenter
} from './index';

import { getLabelConfig, LABEL_PRESETS } from './labelConfig';

import {
  useGroupCompanyLevelMine
} from '@/components/GroupAndCompany/src/hooks/useGroupCompanyLevelMine';

// 使用辅助函数
import { getViewer, safeCesiumOperation, clearEntityArray } from './helpers';

const {
  getTunnelGeoJSON,
  getDevicePointGeoJSON,
} = useGroupCompanyLevelMine();

// 用 Map 管理每个 key 的 stop handle
const watchStops = new Map();
const labelMap = new Map();
const verticalShafts: any[] = [];

/**
 * 清除指定名称的数据源和相关实体
 * @param {string} name - 数据源名称
 * @returns {void}
 */
function clearDataSource(name) {
  safeCesiumOperation((viewer) => {
    // 移除数据源
    const dataSources = viewer.dataSources._dataSources.filter(dataSource => dataSource.name === name);
    dataSources.forEach(data => {
      viewer.dataSources.remove(data);
    });

    // 如果是隧道数据，清除立井实体
    if (name.includes('tunnel')) {
      clearEntityArray(verticalShafts);
    }

    // 清除相关标签
    const labels = labelMap.get(name);
    if (labels) {
      labels.forEach(label => {
        viewer.entities.remove(label);
      });
      labelMap.delete(name);
    }
  }, `清除数据源 ${name} 失败`);
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
        data.name = name;
        return viewer.dataSources.add(data);
      })
      .then((dataSource) => {
        console.log('geoJSONPointLoad: ', geojson);
        const { isSetupClustering } = options;
        if (isSetupClustering) {
          setupClustering(dataSource);
        }

        // 为每个点创建图标标记
        dataSource.entities.values.forEach((point) => {
          createIconMarker(point, name);
        });

        if (typeof callback === 'function') {
          callback(null, dataSource);
        }
      })
      .catch((error) => {
        console.error('Error loading GeoJSON point data:', error);
        if (typeof callback === 'function') {
          callback(error);
        }
      });
  }, `加载GeoJSON点数据 ${name} 失败`);
}

function computeCircle(radius) {
  const positions: any[] = [];
  for (let i = 0; i < 360; i++) {
    const radians = CesiumMath.toRadians(i);
    positions.push(
      new Cesium.Cartesian2(
        radius * Math.cos(radians),
        radius * Math.sin(radians),
      ),
    );
  }
  return positions;
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
    const error = new Error('geoJSONLineStringLoad: geojson and name are required');
    console.error(error.message);
    if (typeof callback === 'function') {
      callback(error);
    }
    return;
  }

  safeCesiumOperation((viewer) => {
    GeoJsonDataSource.load(geojson, options)
      .then((data) => {
        data.name = name;
        return viewer.dataSources.add(data);
      })
      .then((dataSource) => {
        if (!dataSource || !dataSource.entities) {
          throw new Error('Data source or entities not available');
        }

        // 处理每条线实体
        dataSource.entities.values.forEach((line) => {
          processLineEntity(line, name, viewer);
        });

        if (typeof callback === 'function') {
          callback(null, dataSource);
        }
      })
      .catch((error) => {
        console.error('Error loading GeoJSON line data:', error);
        if (typeof callback === 'function') {
          callback(error);
        }
      });
  }, `加载GeoJSON线数据 ${name} 失败`);
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
      console.warn('Invalid line entity:', line);
      return;
    }

    const properties = line.properties.getValue();
    if (!properties) {
      console.warn('No properties found for line:', line);
      return;
    }

    const { color, width, tunnelName, tunnelType } = properties;

    // 验证必要属性
    if (!color) {
      console.warn('Missing color property for line:', line);
      return;
    }

    // 验证polyline存在
    if (!line.polyline || typeof line.polyline.positions?.getValue !== 'function') {
      console.warn('Invalid polyline for line:', line);
      return;
    }

    const positions = line.polyline.positions.getValue();

    // 验证positions数组
    if (!Array.isArray(positions) || positions.length < 2) {
      console.warn('Insufficient positions for line:', line);
      return;
    }

    const _color = CesiumColor.fromCssColorString(color);

    // 设置线颜色
    setLineColor(line);

    // 设置线名称标签
    setLineName(name, { positions, tunnelName });

    // 根据隧道类型处理特殊效果
    if ([1, 2, 15].includes(tunnelType)) {
      // 立井：创建圆柱体表示
      createVerticalShaft(positions, _color, tunnelName, viewer);
    } else {
      // 普通隧道：创建多边形体积
      createTunnelVolume(line, positions, _color);
    }
  } catch (error: any) {
    console.error('Error processing line entity:', line, error);
  }
}
/**
 * 设置线颜色和宽度
 * @param {Object} line - 线实体对象
 * @returns {void}
 */
function setLineColor(line) {
  const { color, width } = line.properties.getValue();
  const _color = CesiumColor.fromCssColorString(color);
  line.polyline.material = new PolylineArrowMaterialProperty(_color);
  line.polyline.width = width ?? 12;
}

/**
 * 设置线名称并在线的几何中心位置添加高度标签
 * @param {string} name - 数据源名称
 * @param {Object} lineData - 包含位置和隧道名称的线数据
 * @returns {void}
 */
function setLineName(name, lineData) {
  const { positions, tunnelName } = lineData;
  if (!tunnelName) return;

  safeCesiumOperation((viewer) => {
    const position = getPolylineGeometricCenter(positions);
    const label = viewer.entities.add({
      position: position,
      label: {
        text: tunnelName,
        verticalOrigin: VerticalOrigin.CENTER,
        horizontalOrigin: HorizontalOrigin.CENTER,
        eyeOffset: new Cartesian3(0, 0, -40),
        ...getLabelConfig(LABEL_PRESETS.NORMAL),
      }
    });

    // 保存标签引用以便后续清理
    const labels = labelMap.get(name) || [];
    labels.push(label);
    labelMap.set(name, labels);
  }, `设置线 ${tunnelName} 标签失败`);
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
  console.log('立井: ', tunnelName);

  const length = Cartesian3.distance(positions[1], positions[0]);
  const center = Cartesian3.midpoint(positions[1], positions[0], new Cartesian3());

  const shaft = viewer.entities.add({
    position: center,
    cylinder: {
      length,
      topRadius: 3,
      bottomRadius: 3,
      material: color.withAlpha(0.5),
      outline: true,
      outlineColor: CesiumColor.BLACK.withAlpha(0.3),
      outlineWidth: 1
    }
  });

  verticalShafts.push(shaft);
  console.log('已新增立井 shaft: ', tunnelName, shaft);
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
    cornerType: CornerType.BEVELED,
    material: color.withAlpha(0.5),
    outline: true,
    outlineColor: CesiumColor.BLACK.withAlpha(0.3),
  });
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
  clearDataSource(key);
  if (watchStops.has(key)) {
    watchStops.get(key)();
    watchStops.delete(key);
  }
  if (!is) {
    return;
  }
  const { name } = mine;
  getDevicePoint(name);
  if (stopPointWatch) stopPointWatch();
  const stop = watch(() => unref(getDevicePointGeoJSON), (newVal) => {
    console.log('loadMineDevicePoint: ', key, newVal);
    geoJSONPointLoad(newVal, key);
  });
  watchStops.set(key, stop);
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
  clearDataSource(key);
  if (watchStops.has(key)) {
    watchStops.get(key)();
    watchStops.delete(key);
  }
  if (!is) {
    return;
  }
  const { name } = mine;
  getTunnelLineString(name);
  const stop = watch(() => unref(getTunnelGeoJSON), (newVal) => {
    console.log('getTunnelGeoJSON: ', newVal, key);
    geoJSONLineStringLoad(newVal, key);
  });
  watchStops.set(key, stop);
}
