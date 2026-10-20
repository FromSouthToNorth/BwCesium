/**
 * Cesium 几何计算工具函数集合
 * 提供各种几何计算、坐标转换和空间分析功能
 */

import { Cartesian3, Cartographic, Math as CesiumMath, Rectangle } from 'cesium';

/**
 * 计算多个点的几何中心（质心）
 * @param {Cartesian3[]} positions - 点坐标数组
 * @returns {Cartesian3|undefined} 几何中心点，如果输入为空则返回 undefined
 * @example
 * const center = computeGeometricCenter([point1, point2, point3]);
 */
export function computeGeometricCenter(positions) {
  if (!positions || positions.length === 0) return undefined;

  const sum = new Cartesian3(0, 0, 0);
  let count = 0;

  for (const pos of positions) {
    Cartesian3.add(sum, pos, sum);
    count++;
  }

  return Cartesian3.divideByScalar(sum, count, new Cartesian3());
}

/**
 * 将笛卡尔坐标转换为经纬度坐标（带高度）
 * @param {Cartesian3} cartesian - 笛卡尔坐标
 * @returns {{longitude: number, latitude: number, height: number}} 经纬度坐标对象
 * @example
 * const { longitude, latitude, height } = cartesianToDegrees(cartesianPoint);
 */
export function cartesianToDegrees(cartesian) {
  const cartographic = Cartographic.fromCartesian(cartesian);
  return {
    longitude: CesiumMath.toDegrees(cartographic.longitude),
    latitude: CesiumMath.toDegrees(cartographic.latitude),
    height: cartographic.height,
  };
}

/**
 * 将边界框转换为 Cesium Rectangle（用于相机飞行等）
 * @param {{min: Cartesian3, max: Cartesian3}} bbox - 边界框
 * @param {number} padding - 填充距离（度），默认为 0.01
 * @returns {Rectangle} Cesium Rectangle 对象
 * @example
 * const rect = bboxToRectangle(bbox, 0.02);
 * viewer.camera.flyTo({ destination: rect });
 */
export function bboxToRectangle(bbox, padding = 0.01) {
  const minDeg = cartesianToDegrees(bbox.min);
  const maxDeg = cartesianToDegrees(bbox.max);

  return Rectangle.fromDegrees(
    minDeg.longitude - padding,
    minDeg.latitude - padding,
    maxDeg.longitude + padding,
    maxDeg.latitude + padding
  );
}
