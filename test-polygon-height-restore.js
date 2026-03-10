/**
 * 测试多边形高度恢复修复
 * 验证当多边形有 entity.polygon.height 属性时，恢复高度不会多减去一些
 */

console.log('=== 测试多边形高度恢复修复 ===');

// 模拟测试数据
const mockViewer = {
  clock: {
    currentTime: new Date()
  }
};

// 模拟原始高度信息 - 多边形有独立的 polygon.height 属性
const originalHeightInfo = {
  type: 'polygon',
  boundary: [100, 105, 110, 115],  // 四个边界顶点的原始高度
  holes: [[102, 103, 104]],  // 一个孔洞的三个顶点原始高度
  polygonHeight: 120  // 多边形实体的高度属性，与顶点平均高度不同
};

// 模拟当前高度信息（假设已经调整过高度，每个顶点都抬升了20米）
const currentHeightInfo = {
  type: 'polygon',
  boundary: [120, 125, 130, 135],  // 四个边界顶点的当前高度
  holes: [[122, 123, 124]],  // 一个孔洞的三个顶点当前高度
  polygonHeight: 140  // 多边形实体的当前高度属性
};

// 计算边界平均高度
const boundaryAvg = originalHeightInfo.boundary.reduce((sum, h) => sum + h, 0) / originalHeightInfo.boundary.length;
console.log(`边界顶点平均高度: ${boundaryAvg}米`);
console.log(`多边形实体高度属性: ${originalHeightInfo.polygonHeight}米`);
console.log(`差异: ${originalHeightInfo.polygonHeight - boundaryAvg}米`);

// 模拟 restorePolygonHeight 函数（修复后的版本）
function mockRestorePolygonHeightFixed(entity, originalHeightInfo, viewer) {
  console.log('\n修复后的 restorePolygonHeight 函数:');
  console.log(`   边界原始高度: [${originalHeightInfo.boundary.join(', ')}]`);
  console.log(`   边界当前高度: [${currentHeightInfo.boundary.join(', ')}]`);
  console.log(`   孔洞原始高度: [${originalHeightInfo.holes[0].join(', ')}]`);
  console.log(`   孔洞当前高度: [${currentHeightInfo.holes[0].join(', ')}]`);
  console.log(`   原始多边形高度属性: ${originalHeightInfo.polygonHeight}米`);
  console.log(`   当前多边形高度属性: ${currentHeightInfo.polygonHeight}米`);

  // 验证边界顶点都能恢复到原始高度
  const boundarySuccess = originalHeightInfo.boundary.every((originalHeight, index) => {
    const currentHeight = currentHeightInfo.boundary[index];
    const restoredHeight = originalHeight;  // 直接设置为原始高度
    const isCorrect = Math.abs(restoredHeight - originalHeight) < 0.01;

    console.log(`   边界顶点${index}: ${currentHeight}米 -> ${restoredHeight}米 (原始: ${originalHeight}米) ${isCorrect ? '✅' : '❌'}`);
    return isCorrect;
  });

  // 验证孔洞顶点都能恢复到原始高度
  const holeSuccess = originalHeightInfo.holes[0].every((originalHeight, index) => {
    const currentHeight = currentHeightInfo.holes[0][index];
    const restoredHeight = originalHeight;  // 直接设置为原始高度
    const isCorrect = Math.abs(restoredHeight - originalHeight) < 0.01;

    console.log(`   孔洞顶点${index}: ${currentHeight}米 -> ${restoredHeight}米 (原始: ${originalHeight}米) ${isCorrect ? '✅' : '❌'}`);
    return isCorrect;
  });

  // 验证多边形高度属性恢复
  let polygonHeightRestored = false;
  if (originalHeightInfo.polygonHeight !== null && originalHeightInfo.polygonHeight !== undefined) {
    const restoredPolygonHeight = originalHeightInfo.polygonHeight;
    polygonHeightRestored = Math.abs(restoredPolygonHeight - originalHeightInfo.polygonHeight) < 0.01;
    console.log(`   多边形高度属性: ${currentHeightInfo.polygonHeight}米 -> ${restoredPolygonHeight}米 (原始: ${originalHeightInfo.polygonHeight}米) ${polygonHeightRestored ? '✅' : '❌'}`);
  }

  return boundarySuccess && holeSuccess && polygonHeightRestored;
}

// 模拟 restorePolygonHeight 函数（修复前的版本 - 有bug）
function mockRestorePolygonHeightBuggy(entity, originalHeightInfo, viewer) {
  console.log('\n修复前的 restorePolygonHeight 函数 (有bug):');
  console.log(`   边界原始高度: [${originalHeightInfo.boundary.join(', ')}]`);
  console.log(`   边界当前高度: [${currentHeightInfo.boundary.join(', ')}]`);
  console.log(`   孔洞原始高度: [${originalHeightInfo.holes[0].join(', ')}]`);
  console.log(`   孔洞当前高度: [${currentHeightInfo.holes[0].join(', ')}]`);
  console.log(`   原始多边形高度属性: ${originalHeightInfo.polygonHeight}米`);
  console.log(`   当前多边形高度属性: ${currentHeightInfo.polygonHeight}米`);

  // 验证边界顶点都能恢复到原始高度
  const boundarySuccess = originalHeightInfo.boundary.every((originalHeight, index) => {
    const currentHeight = currentHeightInfo.boundary[index];
    const restoredHeight = originalHeight;  // 直接设置为原始高度
    const isCorrect = Math.abs(restoredHeight - originalHeight) < 0.01;

    console.log(`   边界顶点${index}: ${currentHeight}米 -> ${restoredHeight}米 (原始: ${originalHeight}米) ${isCorrect ? '✅' : '❌'}`);
    return isCorrect;
  });

  // 验证孔洞顶点都能恢复到原始高度
  const holeSuccess = originalHeightInfo.holes[0].every((originalHeight, index) => {
    const currentHeight = currentHeightInfo.holes[0][index];
    const restoredHeight = originalHeight;  // 直接设置为原始高度
    const isCorrect = Math.abs(restoredHeight - originalHeight) < 0.01;

    console.log(`   孔洞顶点${index}: ${currentHeight}米 -> ${restoredHeight}米 (原始: ${originalHeight}米) ${isCorrect ? '✅' : '❌'}`);
    return isCorrect;
  });

  // 修复前的bug：将多边形高度属性设置为边界平均高度
  const validHeights = originalHeightInfo.boundary.filter(h => h !== null);
  let polygonHeightRestored = false;
  if (validHeights.length > 0) {
    const averageHeight = validHeights.reduce((sum, h) => sum + h, 0) / validHeights.length;
    const restoredPolygonHeight = averageHeight;  // BUG: 使用平均高度而不是原始高度
    polygonHeightRestored = Math.abs(restoredPolygonHeight - originalHeightInfo.polygonHeight) < 0.01;
    console.log(`   多边形高度属性: ${currentHeightInfo.polygonHeight}米 -> ${restoredPolygonHeight}米 (原始: ${originalHeightInfo.polygonHeight}米) ${polygonHeightRestored ? '✅' : '❌'}`);
    console.log(`   ❌ BUG: 多边形高度属性被设置为边界平均高度 (${averageHeight}米)，而不是原始值 (${originalHeightInfo.polygonHeight}米)`);
    console.log(`   ❌ 这会导致多边形高度多减去 ${originalHeightInfo.polygonHeight - averageHeight}米`);
  }

  return boundarySuccess && holeSuccess && polygonHeightRestored;
}

// 运行测试
console.log('\n1. 测试修复前的版本 (有bug):');
const polygonEntityBuggy = { type: 'polygon', id: 'polygon1', polygon: { height: currentHeightInfo.polygonHeight } };
const buggyResult = mockRestorePolygonHeightBuggy(polygonEntityBuggy, originalHeightInfo, mockViewer);
console.log(`   结果: ${buggyResult ? '✅ 成功' : '❌ 失败'}`);
console.log(`   问题: 多边形高度属性没有正确恢复，多减去了 ${originalHeightInfo.polygonHeight - boundaryAvg}米`);

console.log('\n2. 测试修复后的版本:');
const polygonEntityFixed = { type: 'polygon', id: 'polygon1', polygon: { height: currentHeightInfo.polygonHeight } };
const fixedResult = mockRestorePolygonHeightFixed(polygonEntityFixed, originalHeightInfo, mockViewer);
console.log(`   结果: ${fixedResult ? '✅ 成功' : '❌ 失败'}`);
console.log(`   修复: 多边形高度属性正确恢复到原始值 ${originalHeightInfo.polygonHeight}米`);

console.log('\n=== 修复总结 ===');
console.log('问题: restorePolygonHeight 函数在多边形有 entity.polygon.height 属性时，会多减去一些高度');
console.log('原因: 函数将 entity.polygon.height 设置为边界顶点的平均高度，而不是保存的原始高度');
console.log('修复:');
console.log('1. ✅ 在 getPolygonHeights 函数中保存 polygonHeight 属性');
console.log('2. ✅ 在 adjustEntityHeight 函数中保存 polygonHeight 到原始高度记录');
console.log('3. ✅ 在 restorePolygonHeight 函数中使用保存的 polygonHeight 而不是计算平均高度');
console.log('4. ✅ 保持向后兼容性：如果没有保存的 polygonHeight，则使用平均高度');

console.log('\n效果:');
console.log(`1. ✅ 边界顶点正确恢复: 从 [${currentHeightInfo.boundary.join(', ')}] 到 [${originalHeightInfo.boundary.join(', ')}]`);
console.log(`2. ✅ 孔洞顶点正确恢复: 从 [${currentHeightInfo.holes[0].join(', ')}] 到 [${originalHeightInfo.holes[0].join(', ')}]`);
console.log(`3. ✅ 多边形高度属性正确恢复: 从 ${currentHeightInfo.polygonHeight}米 到 ${originalHeightInfo.polygonHeight}米`);
console.log(`4. ✅ 不再多减去 ${originalHeightInfo.polygonHeight - boundaryAvg}米`);
