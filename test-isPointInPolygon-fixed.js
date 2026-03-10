// 测试 isPointInPolygon 函数 - 修正版
// 这个测试用于验证多边形范围是否被正确加大

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

    // 修正：将距离（度）转换为公里
    // 1度纬度 ≈ 111.32公里
    // 1度经度 ≈ 111.32 * cos(latitude) 公里
    // 为了简化，我们使用平均纬度
    const avgLat = (pointLat + polygonLngLat.reduce((sum, p) => sum + p.lat, 0) / polygonLngLat.length) / 2;
    const kmPerDegreeLat = 111.32;
    const kmPerDegreeLng = 111.32 * Math.cos(avgLat * Math.PI / 180);

    // 使用更保守的估计：取两者中较小的值
    const kmPerDegree = Math.min(kmPerDegreeLat, kmPerDegreeLng);
    const distanceKm = minDistance * kmPerDegree;

    console.log(`  调试信息: 最小距离=${minDistance.toFixed(6)}度, 平均纬度=${avgLat.toFixed(2)}°, 每度=${kmPerDegree.toFixed(2)}km, 距离=${distanceKm.toFixed(6)}km, 缓冲区=${bufferRadius}km`);

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
console.log('=== 测试 isPointInPolygon 函数（修正版） ===\n');

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
console.log('测试4 - 点在多边形边界附近（有缓冲区 0.001km = 1米）:');
console.log('多边形:', polygon1);
console.log('点:', point3);
console.log('结果:', isPointInPolygon(point3, polygon1, 0.001));
console.log('预期: 可能为false，因为0.001度 ≈ 111米，而缓冲区只有1米\n');

// 测试5：点在多边形边界附近（有更大的缓冲区）
const point4 = [10.0001, 5]; // 距离边界0.0001度 ≈ 11.1米
console.log('测试5 - 点在多边形边界附近（有缓冲区 0.01km = 10米）:');
console.log('多边形:', polygon1);
console.log('点:', point4);
console.log('结果:', isPointInPolygon(point4, polygon1, 0.01));
console.log('预期: true（点在10米缓冲区内）\n');

// 测试6：计算点到线段的距离
console.log('测试6 - 计算点到线段的距离:');
const distance = pointToSegmentDistance(5, 5, 0, 0, 10, 0);
console.log('点: [5, 5], 线段: [0,0] -> [10,0]');
console.log('距离:', distance);
console.log('预期: 5（垂直距离）\n');

// 测试7：实际应用场景 - 使用更大的缓冲区
console.log('测试7 - 实际应用场景（缓冲区 0.1km = 100米）:');
const point5 = [10.001, 5]; // 距离边界0.001度 ≈ 111米
console.log('多边形:', polygon1);
console.log('点:', point5);
console.log('结果:', isPointInPolygon(point5, polygon1, 0.1));
console.log('预期: true（点在100米缓冲区内）\n');

console.log('=== 测试完成 ===');
console.log('\n=== 重要说明 ===');
console.log('1. 默认缓冲区半径: 0.001km (约1米)');
console.log('2. 1度纬度 ≈ 111.32公里');
console.log('3. 1度经度 ≈ 111.32 * cos(纬度) 公里');
console.log('4. 对于小范围区域，可以使用近似值：1度 ≈ 111公里');
console.log('5. 要加大多边形范围，可以增加bufferRadius参数的值');
