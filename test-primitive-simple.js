// 简单测试Primitive检测功能

// 模拟Cesium环境
const Cesium = {
  Cartographic: class Cartographic {
    static fromCartesian(cartesian) {
      return {
        longitude: cartesian.x * 0.00001,
        latitude: cartesian.y * 0.00001,
        height: cartesian.z || 0
      };
    }
  },
  Math: {
    toDegrees: (radians) => radians * (180 / Math.PI)
  },
  BoundingSphere: class BoundingSphere {
    constructor(center) {
      this.center = center;
    }
  }
};

// 模拟isPointInPolygon函数
function isPointInPolygon(point, polygon) {
  // 简单实现：检查点是否在多边形边界框内
  const x = point.x;
  const y = point.y;

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of polygon) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }

  return x >= minX && x <= maxX && y >= minY && y <= maxY;
}

// 模拟getPrimitivePosition函数
function getPrimitivePosition(primitive) {
  if (!primitive) return null;

  try {
    // 1. 尝试获取包围球中心
    if (typeof primitive.getBoundingSphere === 'function') {
      const boundingSphere = primitive.getBoundingSphere();
      if (boundingSphere && boundingSphere.center) {
        return boundingSphere.center;
      }
    }

    // 2. 尝试直接获取位置属性
    if (primitive.position) {
      if (typeof primitive.position.getValue === 'function') {
        return primitive.position.getValue();
      }
      return primitive.position;
    }

    // 3. 尝试获取中心点属性
    if (primitive.center) {
      if (typeof primitive.center.getValue === 'function') {
        return primitive.center.getValue();
      }
      return primitive.center;
    }

    // 4. 尝试获取底部中心点（对于圆柱体等）
    if (primitive.bottomCenter) {
      if (typeof primitive.bottomCenter.getValue === 'function') {
        return primitive.bottomCenter.getValue();
      }
      return primitive.bottomCenter;
    }

    // 5. 尝试获取顶点数组的第一个点（对于线和多边形）
    if (primitive.positions && Array.isArray(primitive.positions) && primitive.positions.length > 0) {
      const position = primitive.positions[0];
      if (typeof position.getValue === 'function') {
        return position.getValue();
      }
      return position;
    }

    return null;
  } catch (error) {
    console.error('Error getting primitive position:', error);
    return null;
  }
}

// 模拟getPrimitivePositions函数
function getPrimitivePositions(primitive) {
  if (!primitive) return null;

  try {
    // 1. 对于线和多边形，获取positions数组
    if (primitive.positions && Array.isArray(primitive.positions)) {
      return primitive.positions.map(pos => {
        if (typeof pos.getValue === 'function') {
          return pos.getValue();
        }
        return pos;
      });
    }

    // 2. 对于其他类型，获取单个位置
    const position = getPrimitivePosition(primitive);
    return position ? [position] : null;
  } catch (error) {
    console.error('Error getting primitive positions:', error);
    return null;
  }
}

// 模拟getPrimitiveType函数
function getPrimitiveType(primitive) {
  if (!primitive) return 'unknown';

  // 通过构造函数名称判断类型
  const constructorName = primitive.constructor?.name || '';

  // 检查常见的Primitive类型
  if (constructorName.includes('Model')) {
    return 'model';
  } else if (constructorName.includes('PointPrimitive') || constructorName.includes('PointGraphics')) {
    return 'point';
  } else if (constructorName.includes('PolylinePrimitive') || constructorName.includes('PolylineGraphics')) {
    return 'line';
  } else if (constructorName.includes('PolygonPrimitive') || constructorName.includes('PolygonGraphics')) {
    return 'polygon';
  } else if (constructorName.includes('LabelPrimitive') || constructorName.includes('LabelGraphics')) {
    return 'label';
  } else if (constructorName.includes('EllipsoidPrimitive') || constructorName.includes('EllipsoidGraphics')) {
    return 'ellipsoid';
  } else if (constructorName.includes('BoxPrimitive') || constructorName.includes('BoxGraphics')) {
    return 'box';
  } else if (constructorName.includes('CylinderPrimitive') || constructorName.includes('CylinderGraphics')) {
    return 'cylinder';
  } else if (primitive.positions && Array.isArray(primitive.positions)) {
    // 根据positions长度判断是线还是多边形
    return primitive.positions.length >= 3 ? 'polygon' : 'line';
  } else if (primitive.position || primitive.center) {
    return 'point';
  } else {
    return 'other';
  }
}

// 模拟isPrimitiveInPolygon函数
function isPrimitiveInPolygon(primitive, polygon) {
  if (!primitive || !polygon || polygon.length < 3) return false;

  const primitiveType = getPrimitiveType(primitive);

  // 获取Primitive的位置或顶点
  const positions = getPrimitivePositions(primitive);
  if (!positions || positions.length === 0) return false;

  // 对于点和模型等单点Primitive，检查单个点
  if (primitiveType === 'point' || primitiveType === 'model' || primitiveType === 'label' ||
    primitiveType === 'ellipsoid' || primitiveType === 'box' || primitiveType === 'cylinder') {

    const position = positions[0];
    if (!position) return false;

    return isPointInPolygon(position, polygon);
  }

  // 对于线和多边形Primitive，检查是否有顶点在裁切多边形内
  if (primitiveType === 'line' || primitiveType === 'polygon') {
    // 如果Primitive的任何一个顶点在裁切多边形内，则认为在裁切区域内
    for (const position of positions) {
      if (isPointInPolygon(position, polygon)) {
        return true;
      }
    }
    return false;
  }

  // 对于其他类型的Primitive，尝试获取第一个点
  const position = positions[0];
  if (!position) return false;

  return isPointInPolygon(position, polygon);
}

// 测试数据
const testPolygon = [
  { x: 116.0, y: 39.0, z: 0 },
  { x: 116.1, y: 39.0, z: 0 },
  { x: 116.1, y: 39.1, z: 0 },
  { x: 116.0, y: 39.1, z: 0 }
];

// 测试用例
function runTests() {
  console.log('=== 开始测试Primitive检测功能 ===\n');

  // 测试1: 有包围球的Primitive
  const primitiveWithBoundingSphere = {
    getBoundingSphere: () => new Cesium.BoundingSphere({ x: 116.05, y: 39.05, z: 100 }),
    constructor: { name: 'ModelPrimitive' }
  };

  console.log('测试1 - 有包围球的Model Primitive:');
  console.log('位置:', getPrimitivePosition(primitiveWithBoundingSphere));
  console.log('类型:', getPrimitiveType(primitiveWithBoundingSphere));
  console.log('顶点:', getPrimitivePositions(primitiveWithBoundingSphere));
  console.log('是否在多边形内:', isPrimitiveInPolygon(primitiveWithBoundingSphere, testPolygon));
  console.log();

  // 测试2: 有position属性的Primitive
  const primitiveWithPosition = {
    position: { x: 116.05, y: 39.05, z: 50 },
    constructor: { name: 'PointPrimitive' }
  };

  console.log('测试2 - 有position属性的Point Primitive:');
  console.log('位置:', getPrimitivePosition(primitiveWithPosition));
  console.log('类型:', getPrimitiveType(primitiveWithPosition));
  console.log('顶点:', getPrimitivePositions(primitiveWithPosition));
  console.log('是否在多边形内:', isPrimitiveInPolygon(primitiveWithPosition, testPolygon));
  console.log();

  // 测试3: 有positions数组的线Primitive
  const linePrimitive = {
    positions: [
      { x: 116.02, y: 39.02, z: 0 },
      { x: 116.08, y: 39.08, z: 0 }
    ],
    constructor: { name: 'PolylinePrimitive' }
  };

  console.log('测试3 - 有positions数组的线Primitive:');
  console.log('位置:', getPrimitivePosition(linePrimitive));
  console.log('类型:', getPrimitiveType(linePrimitive));
  console.log('顶点:', getPrimitivePositions(linePrimitive));
  console.log('是否在多边形内:', isPrimitiveInPolygon(linePrimitive, testPolygon));
  console.log();

  // 测试4: 有positions数组的多边形Primitive
  const polygonPrimitive = {
    positions: [
      { x: 116.03, y: 39.03, z: 0 },
      { x: 116.07, y: 39.03, z: 0 },
      { x: 116.07, y: 39.07, z: 0 },
      { x: 116.03, y: 39.07, z: 0 }
    ],
    constructor: { name: 'PolygonPrimitive' }
  };

  console.log('测试4 - 有positions数组的多边形Primitive:');
  console.log('位置:', getPrimitivePosition(polygonPrimitive));
  console.log('类型:', getPrimitiveType(polygonPrimitive));
  console.log('顶点:', getPrimitivePositions(polygonPrimitive));
  console.log('是否在多边形内:', isPrimitiveInPolygon(polygonPrimitive, testPolygon));
  console.log();

  // 测试5: 有center属性的Primitive
  const primitiveWithCenter = {
    center: { x: 116.05, y: 39.05, z: 30 },
    constructor: { name: 'EllipsoidPrimitive' }
  };

  console.log('测试5 - 有center属性的Ellipsoid Primitive:');
  console.log('位置:', getPrimitivePosition(primitiveWithCenter));
  console.log('类型:', getPrimitiveType(primitiveWithCenter));
  console.log('顶点:', getPrimitivePositions(primitiveWithCenter));
  console.log('是否在多边形内:', isPrimitiveInPolygon(primitiveWithCenter, testPolygon));
  console.log();

  // 测试6: 无效的Primitive
  const invalidPrimitive = {
    someProperty: 'value'
  };

  console.log('测试6 - 无效的Primitive:');
  console.log('位置:', getPrimitivePosition(invalidPrimitive));
  console.log('类型:', getPrimitiveType(invalidPrimitive));
  console.log('顶点:', getPrimitivePositions(invalidPrimitive));
  console.log('是否在多边形内:', isPrimitiveInPolygon(invalidPrimitive, testPolygon));
  console.log();

  console.log('=== 测试完成 ===');
}

// 运行测试
try {
  runTests();
} catch (error) {
  console.error('测试过程中发生错误:', error);
  console.error('错误堆栈:', error.stack);
}
