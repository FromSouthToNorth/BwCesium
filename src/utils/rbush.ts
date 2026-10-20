import RBush from 'rbush';


// cesium 拉近了后 重叠的点还是重叠在一起
const R = 6378137// 地球半径（米）

// Haversine 公式计算两点之间的距离（单位：米）
function haversineDistance(coord1, coord2) {
  const lat1 = coord1.B * Math.PI / 180;
  const lat2 = coord2.B * Math.PI / 180;
  const deltaLat = (coord2.B - coord1.B) * Math.PI / 180;
  const deltaLng = (coord2.L - coord1.L) * Math.PI / 180;

  const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) *
    Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// 自定义 RBush 类以支持 {B, L} 格式
class GeoRBush extends RBush {
  toBBox(item) {
    return {
      minX: item.L,
      minY: item.B,
      maxX: item.L,
      maxY: item.B
    };
  }

  compareMinX(a, b) {
    return a.L - b.L;
  }

  compareMinY(a, b) {
    return a.B - b.B;
  }
}

// 碰撞检测函数
function detectCollisions(points, tree, distanceThreshold = 20) {
  const collisions: any[] = [];
  for (let i = 0; i < points.length; i++) {
    const point = points[i];
    // 定义搜索范围（以经纬度为单位，粗略估算）
    const degreePerMeter = 1 / 111320; // 1度约等于111320米
    const delta = distanceThreshold * degreePerMeter; // 转换为经纬度范围
    const searchBox = {
      minX: point.L - delta,
      minY: point.B - delta,
      maxX: point.L + delta,
      maxY: point.B + delta
    };

    // 查询可能碰撞的点
    const nearbyPoints = tree.search(searchBox);

    // 检查实际距离
    for (let nearbyPoint of nearbyPoints) {
      if (nearbyPoint.MineDesc !== point.MineDesc) {
        const distance = haversineDistance(point, nearbyPoint);
        if (distance < distanceThreshold) {
          collisions.push({
            point1: point.MineDesc,
            point2: nearbyPoint.MineDesc,
            distance: distance
          });
        }
      }
    }
  }
  return collisions;
}

// 计算偏移后的新坐标
function offsetPoint(point, distanceMeters, bearingDegrees) {
  const lat1 = point.B * Math.PI / 180;
  const lng1 = point.L * Math.PI / 180;
  const bearing = bearingDegrees * Math.PI / 180;
  const distance = distanceMeters / R; // 角度距离

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(distance) +
    Math.cos(lat1) * Math.sin(distance) * Math.cos(bearing)
  );
  const lng2 = lng1 + Math.atan2(
    Math.sin(bearing) * Math.sin(distance) * Math.cos(lat1),
    Math.cos(distance) - Math.sin(lat1) * Math.sin(lat2)
  );

  return {
    B: lat2 * 180 / Math.PI,
    L: lng2 * 180 / Math.PI,
    MineDesc: point.MineDesc
  };
}

// 偏移碰撞点并更新坐标
function resolveCollisions(points, tree, distanceThreshold = 20) {
  // 插入点到 R 树
  tree.load(points);

  // 检测碰撞
  let collisions = detectCollisions(points, tree, distanceThreshold);

  // 存储已偏移的点 ID
  const offsetPoints = new Set();

  // 处理每对碰撞
  collisions.forEach(({ point1, point2 }) => {
    // 选择 point2 进行偏移（按 MineDesc 字母序较小的点保持不动）
    const pointToMoveId = point1 < point2 ? point2 : point1;
    if (offsetPoints.has(pointToMoveId)) return; // 避免重复偏移

    // 找到需要偏移的点
    const pointToMove = points.find(p => p.MineDesc === pointToMoveId);
    if (!pointToMove) return;

    // 随机生成偏移方向（0-360度）
    const bearing = Math.random() * 360;
    // 偏移距离略大于阈值（例如 101 米）
    const newPoint = offsetPoint(pointToMove, distanceThreshold, bearing);
    console.log('newPoint: ', newPoint);


    // 更新 R 树
    tree.remove(pointToMove);
    tree.insert(newPoint);

    // 更新原始点数据
    const index = points.findIndex(p => p.MineDesc === pointToMoveId);
    points[index].B = newPoint.B;
    points[index].L = newPoint.L;

    offsetPoints.add(pointToMoveId);
  });

  // 重新检测碰撞，确保没有新的碰撞
  collisions = detectCollisions(points, tree, distanceThreshold);
  if (collisions.length > 0) {
    console.log('New collisions detected after offset, further resolution needed:', collisions);
  }

  return points;
}

export function offsetMinePoint(data) {
  console.log('offsetMinePoint: ', data);
  const tree = new GeoRBush();
  const points: any[] = [];
  data.forEach((e) => {
    const { B, L, MineDesc } = e;
    points.push({ B, L, MineDesc });
  });
  const updatedPoints = resolveCollisions(points, tree, 20);

  // 验证最终距离
  const finalCollisions = detectCollisions(updatedPoints, tree, 20);
  console.log('Final collisions:', finalCollisions);

  updatedPoints.forEach(({ B, L, MineDesc }) => {
    for (const { MineDesc } of data) {
      if (MineDesc === MineDesc) {
        data.B = B;
        data.L = L;
        break;
      }
    }
  });
  return data
}
