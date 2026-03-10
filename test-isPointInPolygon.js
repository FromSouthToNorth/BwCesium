// 测试 isPointInPolygon 函数
// 这个测试用于验证多边形范围是否被正确加大

// 模拟 Cartographic 和 CesiumMath 对象
const mockCartographic = {
  fromCartesian: (point) => {
    // 简单模拟：假设 point 是 [lng, lat] 数组
    return {
      longitude: point[0] * Math.PI / 180, // 转换为弧度
      latitude: point[1] * Math.PI / 180,
      height: 0
    };
  }
};

const mockCesiumMath = {
  toDegrees: (radians) => radians * 180 / Math.PI
};

// 模拟 isPointInPolygon 函数（简化版）
function isPointInPolygon(point, polygon, bufferRadius = 0.001) {
  if (!point || !polygon || polygon.length < 3) return false;

  const pointLng = point[0];
  const pointLat = point[1];

  const polygonLngLat = polygon.map(pos => ({
    lng: pos[0],
    lat: pos[1]
  }));

  let inside = false;
  const n = polygonLngLat.length;

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygonLngLat[i].lng;
    const yi = polygonLngLat[i].lat;
    const xj = polygonLngLat[j].lng;
    const yj = polygonLngLat[j].lat;

    const intersect = ((yi > pointLat) !== (yj > pointLat)) &&
      (pointLng < (xj - xi) * (pointLat - yi) / (yj - yi) + xi);

    if (intersect) inside = !inside;
  }

  if (inside) return true;

  if (bufferRadius > 0) {
    let minDistance = Infinity;

    for (let i = 0, j = n - 1; i < n; j = i++) {
      const xi = polygonLngLat[i].lng;
      const yi = polygonLngLat[i].lat;
      const xj = polygonLngLat[j].lng;
      const yj = polygonLngLat[j].lat;

      const distance = pointToSegmentDistance(pointLng, pointLat, xi, yi, xj, yj);
      minDistance = Math.min(minDistance, distance);
    }

    const distanceKm = minDistance * 111.32;
    return distanceKm <= bufferRadius;
  }

  return false;
}

function pointToSegmentDistance(px, py, x1, y1, x2, y2) {
  const A = px - x1;
  const B = py - y1;
  const C = x2 - x1;
  const D = y2 - y1;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = -1;

  if (lenSq !== 0) {
    param = dot / lenSq;
  }

  let xx, yy;

  if (param < 0) {
    xx = x1;
    yy = y1;
  } else if (param > 1) {
    xx = x2;
    yy = y2;
  } else {
    xx = x1 + param * C;
    yy = y1 + param * D;
  }

  const dx = px - xx;
  const dy = py - yy;

  return Math.sqrt(dx * dx + dy * dy);
}

// 测试用例
console.log('=== 测试 isPointInPolygon 函数 ===\n');

// 测试1：点在多边形内
const polygon1 = [
  [0, 0], [10, 0], [10, 10], [0, 10]
];
const point1 = [5, 5];
console.log('测试1 - 点在多边形内:');
console.log('多边形:', polygon1);
console.log('点:', point1);
console.log('结果:', isPointInPolygon(point1, polygon1));
console.log('预期: true\n');

// 测试2：点在多边形外
const point2 = [15, 15];
console.log('测试2 - 点在多边形外:');
console.log('多边形:', polygon1);
console.log('点:', point2);
console.log('结果:', isPointInPolygon(point2, polygon1));
console.log('预期: false\n');

// 测试3：点在多边形边界附近（无缓冲区）
const point3 = [10.001, 5]; // 刚好在多边形外
console.log('测试3 - 点在多边形边界附近（无缓冲区）:');
console.log('多边形:', polygon1);
console.log('点:', point3);
console.log('结果:', isPointInPolygon(point3, polygon1, 0));
console.log('预期: false\n');

// 测试4：点在多边形边界附近（有缓冲区）
console.log('测试4 - 点在多边形边界附近（有缓冲区 0.001km）:');
console.log('多边形:', polygon1);
console.log('点:', point3);
console.log('结果:', isPointInPolygon(point3, polygon1, 0.001));
console.log('预期: true（因为点在缓冲区范围内）\n');

// 测试5：计算点到线段的距离
console.log('测试5 - 计算点到线段的距离:');
const distance = pointToSegmentDistance(5, 5, 0, 0, 10, 0);
console.log('点: [5, 5], 线段: [0,0] -> [10,0]');
console.log('距离:', distance);
console.log('预期: 5（垂直距离）\n');

// 测试6：不同缓冲区大小
const point4 = [10.01, 5]; // 距离边界约0.01度
console.log('测试6 - 不同缓冲区大小:');
console.log('多边形:', polygon1);
console.log('点:', point4);
console.log('无缓冲区结果:', isPointInPolygon(point4, polygon1, 0));
console.log('小缓冲区结果 (0.001km):', isPointInPolygon(point4, polygon1, 0.001));
console.log('大缓冲区结果 (0.01km):', isPointInPolygon(point4, polygon1, 0.01));

console.log('\n=== 测试完成 ===');
