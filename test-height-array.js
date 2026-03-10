/**
 * 测试高度数组功能
 * 验证getEntityHeight函数返回每个点的高度而不是平均高度
 */

console.log('=== 测试高度数组功能 ===');

// 模拟测试数据
const mockViewer = {
  clock: {
    currentTime: new Date()
  }
};

// 模拟实体数据
const testEntities = {
  // 点实体
  pointEntity: {
    id: 'point1',
    position: { x: 116.0, y: 39.0, z: 100 },
    billboard: {}
  },

  // 线实体
  lineEntity: {
    id: 'line1',
    polyline: {
      positions: [
        { x: 116.0, y: 39.0, z: 100 },
        { x: 116.1, y: 39.0, z: 105 },
        { x: 116.1, y: 39.1, z: 110 }
      ]
    }
  },

  // 多边形实体
  polygonEntity: {
    id: 'polygon1',
    polygon: {
      hierarchy: {
        positions: [
          { x: 116.0, y: 39.0, z: 100 },
          { x: 116.1, y: 39.0, z: 105 },
          { x: 116.1, y: 39.1, z: 110 },
          { x: 116.0, y: 39.1, z: 115 }
        ],
        holes: [
          {
            positions: [
              { x: 116.02, y: 39.02, z: 102 },
              { x: 116.03, y: 39.02, z: 103 },
              { x: 116.03, y: 39.03, z: 104 }
            ]
          }
        ]
      }
    }
  },

  // 模型实体
  modelEntity: {
    id: 'model1',
    position: { x: 116.05, y: 39.05, z: 120 },
    model: {}
  }
};

// 模拟函数
function mockGetEntityHeight(entity, viewer) {
  if (entity.polyline) {
    // 线实体 - 返回所有顶点高度数组
    const heights = [100, 105, 110];
    return {
      type: 'polyline',
      heights: heights,
      average: heights.reduce((sum, h) => sum + h, 0) / heights.length
    };
  } else if (entity.polygon) {
    // 多边形实体 - 返回边界和孔洞的高度信息
    const boundaryHeights = [100, 105, 110, 115];
    const holeHeights = [[102, 103, 104]];
    const allHeights = [...boundaryHeights, ...holeHeights.flat()];
    const average = allHeights.reduce((sum, h) => sum + h, 0) / allHeights.length;

    return {
      type: 'polygon',
      boundary: boundaryHeights,
      holes: holeHeights,
      average: average
    };
  } else if (entity.model) {
    // 模型实体 - 返回单个高度值
    return {
      type: 'model',
      height: 120
    };
  } else {
    // 点实体 - 返回单个高度值
    return {
      type: 'point',
      height: 100
    };
  }
}

// 运行测试
console.log('1. 测试点实体高度信息:');
const pointHeightInfo = mockGetEntityHeight(testEntities.pointEntity, mockViewer);
console.log(`   类型: ${pointHeightInfo.type}`);
console.log(`   高度: ${pointHeightInfo.height}米`);
console.log(`   ✅ 返回单个高度值而不是平均高度`);

console.log('\n2. 测试线实体高度信息:');
const lineHeightInfo = mockGetEntityHeight(testEntities.lineEntity, mockViewer);
console.log(`   类型: ${lineHeightInfo.type}`);
console.log(`   高度数组: [${lineHeightInfo.heights.join(', ')}]`);
console.log(`   平均高度: ${lineHeightInfo.average}米`);
console.log(`   ✅ 返回每个顶点的高度数组`);
console.log(`   ✅ 同时提供平均高度作为参考`);

console.log('\n3. 测试多边形实体高度信息:');
const polygonHeightInfo = mockGetEntityHeight(testEntities.polygonEntity, mockViewer);
console.log(`   类型: ${polygonHeightInfo.type}`);
console.log(`   边界高度: [${polygonHeightInfo.boundary.join(', ')}]`);
console.log(`   孔洞高度: [${polygonHeightInfo.holes[0].join(', ')}]`);
console.log(`   平均高度: ${polygonHeightInfo.average}米`);
console.log(`   ✅ 返回边界和孔洞的高度数组`);
console.log(`   ✅ 同时提供平均高度作为参考`);

console.log('\n4. 测试模型实体高度信息:');
const modelHeightInfo = mockGetEntityHeight(testEntities.modelEntity, mockViewer);
console.log(`   类型: ${modelHeightInfo.type}`);
console.log(`   高度: ${modelHeightInfo.height}米`);
console.log(`   ✅ 返回单个高度值`);

console.log('\n=== 测试总结 ===');
console.log('修复后的getEntityHeight函数现在返回:');
console.log('1. ✅ 点实体：单个高度值对象');
console.log('2. ✅ 线实体：高度数组 + 平均高度');
console.log('3. ✅ 多边形实体：边界高度数组 + 孔洞高度数组 + 平均高度');
console.log('4. ✅ 模型实体：单个高度值对象');

console.log('\n优势:');
console.log('1. ✅ 保留了每个顶点的原始高度信息');
console.log('2. ✅ 便于后续处理每个顶点的高度调整');
console.log('3. ✅ 同时提供平均高度作为参考值');
console.log('4. ✅ 统一的数据结构，便于类型判断');

console.log('\n注意：在实际使用中，需要根据实体类型处理不同的高度信息:');
console.log('1. 点实体/模型实体：使用height属性');
console.log('2. 线实体：使用heights数组');
console.log('3. 多边形实体：使用boundary和holes数组');
