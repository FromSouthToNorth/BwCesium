/**
 * 测试Primitive检测功能
 */

// 模拟Cesium环境
global.Cesium = {
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

// 导入测试函数
import { getPrimitivePosition, getPrimitivePositions, getPrimitiveType, isPrimitiveInPolygon } from './src/utils/cesium/elevation/entitySelector.js';

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
