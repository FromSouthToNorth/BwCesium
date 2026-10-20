import {
  PinBuilder,
  Color as CesiumColor,
  VerticalOrigin,
  defined,
  Rectangle
} from 'cesium';

import { flyTo, entitiesToGeoJSON } from './index';
import { turfBbox } from '@/utils/turf';

// 使用常量配置
import { CLUSTER_CONFIG } from './constants';

const PIN_SIZES = [48, 32];

/**
 * 根据实体数量获取对应的聚类图标
 * 根据配置的阈值返回不同颜色的图标
 * @param {PinBuilder} pinBuilder - Cesium PinBuilder 实例
 * @param {number} count - 聚类中的实体数量
 * @returns {string} 图标的数据URL
 */
function getClusterImage(pinBuilder, count) {
  for (const config of CLUSTER_CONFIG.COUNT_THRESHOLDS) {
    if (count >= config.threshold) {
      return pinBuilder.fromText(count, config.color, PIN_SIZES[1]).toDataURL();
    }
  }
  return pinBuilder.fromText(count, CesiumColor.GREEN, PIN_SIZES[1]).toDataURL();
}

/**
 * 设置数据源的聚类功能
 * 配置聚类参数并应用自定义样式
 * @param {Object} dataSource - Cesium 数据源对象
 * @returns {void}
 * 
 * @example
 * // 使用示例
 * const dataSource = await GeoJsonDataSource.load(geojson);
 * setupClustering(dataSource);
 */
export function setupClustering(dataSource) {
  if (!dataSource || !dataSource.clustering) {
    console.error('Invalid dataSource or missing clustering property');
    return;
  }

  const pinBuilder = new PinBuilder();

  // 配置聚类参数
  dataSource.clustering.enabled = CLUSTER_CONFIG.ENABLED;
  dataSource.clustering.pixelRange = CLUSTER_CONFIG.PIXEL_RANGE;
  dataSource.clustering.minimumClusterSize = CLUSTER_CONFIG.MINIMUM_CLUSTER_SIZE;

  let removeListener;

  // 预生成单数字图标（2-9）
  const singleDigitPins = new Array(8);
  for (let i = 0; i < singleDigitPins.length; ++i) {
    singleDigitPins[i] = pinBuilder
      .fromText(`${i + 2} `, CesiumColor.VIOLET, PIN_SIZES[0])
      .toDataURL();
  }

  /**
   * 应用自定义聚类样式
   * 替换默认的标签显示为自定义图标
   */
  function applyCustomStyle() {
    if (defined(removeListener)) {
      removeListener();
      removeListener = undefined;
    } else {
      removeListener = dataSource.clustering.clusterEvent.addEventListener(
        function (clusteredEntities, cluster) {
          if (!cluster || !clusteredEntities) return;

          // 隐藏默认标签，显示自定义图标
          cluster.label.show = false;
          cluster.billboard.show = true;
          cluster.billboard.id = cluster.label.id;
          cluster.billboard.verticalOrigin = VerticalOrigin.BOTTOM;

          const count = clusteredEntities.length;
          const image = getClusterImage(pinBuilder, count);
          cluster.billboard.image = image;
        }
      );
    }

    // 强制重新聚类以应用新样式
    const pixelRange = dataSource.clustering.pixelRange;
    dataSource.clustering.pixelRange = 0;
    dataSource.clustering.pixelRange = pixelRange;
  }

  // 应用自定义样式
  applyCustomStyle();
}

/**
 * 缩放到聚类实体的边界范围
 * 计算所有实体的边界框并飞行到该区域
 * @param {Object} dataSource - 包含聚类实体的数据源
 * @returns {void}
 * 
 * @example
 * // 使用示例
 * clusteringZoom(dataSource);
 */
export function clusteringZoom(dataSource) {
  if (!dataSource || dataSource.length === 0) {
    console.warn('No entities found for clustering zoom');
    return;
  }

  try {
    // 将实体转换为 GeoJSON
    const geojson = entitiesToGeoJSON(dataSource);

    if (!geojson || !geojson.features || geojson.features.length === 0) {
      console.warn('No valid GeoJSON generated from entities');
      return;
    }

    // 计算边界框
    const bbox = turfBbox(geojson);

    if (!bbox || bbox.length !== 4) {
      console.warn('Invalid bounding box calculated');
      return;
    }

    // 创建带边距的矩形区域
    const padding = 0.2; // 20% 的边距
    const destination = Rectangle.fromDegrees(
      bbox[0] - padding,
      bbox[1] - padding,
      bbox[2] + padding,
      bbox[3] + padding
    );

    // 飞行到目标区域
    flyTo(destination);
  } catch (error) {
    console.error('Error in clusteringZoom:', error);
  }
}
