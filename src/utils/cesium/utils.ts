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
 * 将经纬度坐标转换为笛卡尔坐标
 * @param {number} longitude - 经度（度）
 * @param {number} latitude - 纬度（度）
 * @param {number} height - 高度（米），默认为 0
 * @returns {Cartesian3} 笛卡尔坐标
 * @example
 * const cartesian = degreesToCartesian(116.397, 39.908, 100);
 */
export function degreesToCartesian(longitude, latitude, height = 0) {
  return Cartesian3.fromDegrees(longitude, latitude, height);
}

/**
 * 计算两点之间的欧几里得距离（米）
 * @param {Cartesian3} point1 - 第一个点
 * @param {Cartesian3} point2 - 第二个点
 * @returns {number} 距离（米）
 * @example
 * const distance = computeDistance(pointA, pointB);
 */
export function computeDistance(point1, point2) {
  return Cartesian3.distance(point1, point2);
}

/**
 * 计算折线的总长度（米）
 * @param {Cartesian3[]} positions - 折线顶点数组
 * @returns {number} 总长度（米）
 * @example
 * const length = computePolylineLength([point1, point2, point3]);
 */
export function computePolylineLength(positions) {
  if (!positions || positions.length < 2) return 0;

  let totalLength = 0;
  for (let i = 1; i < positions.length; i++) {
    totalLength += Cartesian3.distance(positions[i - 1], positions[i]);
  }
  return totalLength;
}

/**
 * 计算多边形的面积（平方米）
 * @param {Cartesian3[]} positions - 多边形顶点数组（需要闭合）
 * @returns {number} 面积（平方米）
 * @example
 * const area = computePolygonArea([point1, point2, point3, point1]);
 */
export function computePolygonArea(positions) {
  if (!positions || positions.length < 3) return 0;

  let area = 0;
  const n = positions.length;

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += positions[i].x * positions[j].y;
    area -= positions[j].x * positions[i].y;
  }

  return Math.abs(area) / 2;
}

/**
 * 生成圆形顶点坐标
 * @param {number} radius - 半径（米）
 * @param {number} segments - 分段数，默认为 36
 * @param {Cartesian3} center - 中心点，默认为 Cartesian3.ZERO
 * @returns {Cartesian3[]} 圆形顶点坐标数组（闭合）
 * @example
 * const circle = generateCircleVertices(100, 36, centerPoint);
 */
export function generateCircleVertices(radius, segments = 36, center = Cartesian3.ZERO) {
  const vertices: any[] = [];
  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const x = center.x + radius * Math.cos(angle);
    const y = center.y + radius * Math.sin(angle);
    const z = center.z;
    vertices.push(new Cartesian3(x, y, z));
  }
  // 闭合圆形
  vertices.push(vertices[0].clone());
  return vertices;
}

/**
 * 生成矩形顶点坐标
 * @param {number} width - 宽度（米）
 * @param {number} height - 高度（米）
 * @param {Cartesian3} center - 中心点
 * @returns {Cartesian3[]} 矩形顶点坐标数组（闭合）
 * @example
 * const rectangle = generateRectangleVertices(50, 30, centerPoint);
 */
export function generateRectangleVertices(width, height, center = Cartesian3.ZERO) {
  const halfWidth = width / 2;
  const halfHeight = height / 2;

  return [
    new Cartesian3(center.x - halfWidth, center.y - halfHeight, center.z),
    new Cartesian3(center.x + halfWidth, center.y - halfHeight, center.z),
    new Cartesian3(center.x + halfWidth, center.y + halfHeight, center.z),
    new Cartesian3(center.x - halfWidth, center.y + halfHeight, center.z),
    new Cartesian3(center.x - halfWidth, center.y - halfHeight, center.z), // 闭合
  ];
}

/**
 * 计算边界框（包围盒）
 * @param {Cartesian3[]} positions - 点坐标数组
 * @returns {{min: Cartesian3, max: Cartesian3}|undefined} 边界框对象，包含最小和最大点
 * @example
 * const bbox = computeBoundingBox(points);
 * console.log(`Min: ${bbox.min}, Max: ${bbox.max}`);
 */
export function computeBoundingBox(positions) {
  if (!positions || positions.length === 0) return undefined;

  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

  for (const pos of positions) {
    minX = Math.min(minX, pos.x);
    minY = Math.min(minY, pos.y);
    minZ = Math.min(minZ, pos.z);
    maxX = Math.max(maxX, pos.x);
    maxY = Math.max(maxY, pos.y);
    maxZ = Math.max(maxZ, pos.z);
  }

  return {
    min: new Cartesian3(minX, minY, minZ),
    max: new Cartesian3(maxX, maxY, maxZ),
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

/**
 * 计算点到线的垂直距离
 * @param {Cartesian3} point - 点坐标
 * @param {Cartesian3} lineStart - 线段起点
 * @param {Cartesian3} lineEnd - 线段终点
 * @returns {number} 垂直距离（米）
 * @example
 * const distance = pointToLineDistance(point, lineStart, lineEnd);
 */
export function pointToLineDistance(point, lineStart, lineEnd) {
  const lineVec = Cartesian3.subtract(lineEnd, lineStart, new Cartesian3());
  const pointVec = Cartesian3.subtract(point, lineStart, new Cartesian3());

  const lineLength = Cartesian3.magnitude(lineVec);
  if (lineLength === 0) return Cartesian3.distance(point, lineStart);

  const normalizedLineVec = Cartesian3.divideByScalar(lineVec, lineLength, new Cartesian3());
  const projectionLength = Cartesian3.dot(pointVec, normalizedLineVec);

  if (projectionLength < 0) {
    return Cartesian3.distance(point, lineStart);
  } else if (projectionLength > lineLength) {
    return Cartesian3.distance(point, lineEnd);
  } else {
    const projectionVec = Cartesian3.multiplyByScalar(normalizedLineVec, projectionLength, new Cartesian3());
    const closestPoint = Cartesian3.add(lineStart, projectionVec, new Cartesian3());
    return Cartesian3.distance(point, closestPoint);
  }
}

/**
 * 插值计算两点之间的点
 * @param {Cartesian3} start - 起点
 * @param {Cartesian3} end - 终点
 * @param {number} t - 插值系数（0-1）
 * @returns {Cartesian3} 插值点
 * @example
 * const midpoint = interpolate(pointA, pointB, 0.5);
 */
export function interpolate(start, end, t) {
  return new Cartesian3(
    start.x + (end.x - start.x) * t,
    start.y + (end.y - start.y) * t,
    start.z + (end.z - start.z) * t
  );
}

/**
 * 计算向量的单位向量
 * @param {Cartesian3} vector - 向量
 * @returns {Cartesian3} 单位向量
 * @example
 * const unitVec = normalizeVector(vector);
 */
export function normalizeVector(vector) {
  const magnitude = Cartesian3.magnitude(vector);
  if (magnitude === 0) return Cartesian3.clone(Cartesian3.ZERO);
  return Cartesian3.divideByScalar(vector, magnitude, new Cartesian3());
}

/**
 * 计算两个向量的叉积
 * @param {Cartesian3} v1 - 第一个向量
 * @param {Cartesian3} v2 - 第二个向量
 * @returns {Cartesian3} 叉积向量
 * @example
 * const cross = crossProduct(vec1, vec2);
 */
export function crossProduct(v1, v2) {
  return new Cartesian3(
    v1.y * v2.z - v1.z * v2.y,
    v1.z * v2.x - v1.x * v2.z,
    v1.x * v2.y - v1.y * v2.x
  );
}

/**
 * 计算两个向量的点积
 * @param {Cartesian3} v1 - 第一个向量
 * @param {Cartesian3} v2 - 第二个向量
 * @returns {number} 点积
 * @example
 * const dot = dotProduct(vec1, vec2);
 */
export function dotProduct(v1, v2) {
  return v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
}

/**
 * 计算向量的夹角（弧度）
 * @param {Cartesian3} v1 - 第一个向量
 * @param {Cartesian3} v2 - 第二个向量
 * @returns {number} 夹角（弧度）
 * @example
 * const angle = angleBetweenVectors(vec1, vec2);
 */
export function angleBetweenVectors(v1, v2) {
  const dot = dotProduct(v1, v2);
  const mag1 = Cartesian3.magnitude(v1);
  const mag2 = Cartesian3.magnitude(v2);

  if (mag1 === 0 || mag2 === 0) return 0;

  const cosAngle = dot / (mag1 * mag2);
  return Math.acos(Math.max(-1, Math.min(1, cosAngle)));
}
