# 高程控制模块

## 概述

高程控制模块提供裁切区域内实体高度调整的完整功能。支持对点、线、多边形、模型、标签等多种Cesium实体进行高度调整。

## 功能特性

### 1. 实体检测
- ✅ **点实体**：通过位置点检测
- ✅ **线实体**：通过顶点检测（至少一个顶点在裁切区域内）
- ✅ **线体积实体**：通过顶点检测（至少一个顶点在裁切区域内，作为 polyline 的扩展属性）
- ✅ **多边形实体**：通过顶点检测（至少一个顶点在裁切区域内）
- ✅ **模型实体**：通过位置点检测
- ✅ **标签实体**：通过位置点检测
- ✅ **Primitive实体**：通过包围球或顶点检测（支持Model、Point、Polyline、Polygon等Primitive类型）
- ✅ **其他实体**：通过位置点检测

### 2. 高度调整
- ✅ **相对高度调整**：支持正负值调整（抬升/下降）
- ✅ **批量操作**：支持大量实体同时调整
- ✅ **高度恢复**：可恢复实体的原始高度
- ✅ **性能优化**：分批处理避免界面卡顿

### 3. 状态管理
- ✅ **原始高度保存**：自动保存实体的原始高度
- ✅ **状态跟踪**：完整的操作历史和状态跟踪
- ✅ **错误处理**：单个实体失败不影响整体操作

## 模块结构

```
src/utils/cesium/elevation/
├── index.js              # 主入口，提供完整API
├── clippingIntegration.js # 裁切功能集成
├── entitySelector.js     # 实体选择器
├── heightAdjuster.js     # 高度调整器
├── README.md            # 本文档
└── test.js              # 测试文件
```

## API 文档

### 核心函数

#### `adjustClippingAreaElevation(offset)`
调整当前裁切区域内所有实体的高度。

**参数：**
- `offset` (number): 高度偏移量（米），正数为抬升，负数为下降

**返回值：** Promise<Object>
```javascript
{
  total: 10,      // 总实体数
  success: 8,     // 成功调整的实体数
  failed: 2,      // 失败的实体数
  details: [...]  // 详细结果数组
}
```

#### `restoreClippingAreaElevation()`
恢复当前裁切区域内所有实体的原始高度。

**返回值：** Promise<Object>
```javascript
{
  total: 10,      // 总实体数
  restored: 8,    // 成功恢复的实体数
  failed: 2,      // 失败的实体数
  details: [...]  // 详细结果数组
}
```

#### `getClippingElevationInfo()`
获取当前裁切区域的高度调整信息。

**返回值：** Object
```javascript
{
  hasClipping: true,           // 是否有激活的裁切区域
  clippingInfo: { ... },       // 裁切区域信息
  entityStats: { ... },        // 实体统计信息
  heightStats: { ... },        // 高度调整统计信息
  canAdjust: true,             // 是否可以调整高度
  canRestore: false            // 是否可以恢复高度
}
```

#### `canAdjustElevation()`
检查是否可以进行高度调整。

#### `canRestoreElevation()`
检查是否可以进行高度恢复。

#### `clearElevationData()`
清除所有高度调整相关数据。

### 工具函数集合

```javascript
import { elevationUtils } from '@/utils/cesium/elevation';

// 使用工具函数
const info = elevationUtils.getClippingElevationInfo();
const canAdjust = elevationUtils.canAdjustElevation();
```

## 使用示例

### 1. 基本使用

```javascript
import { 
  adjustClippingAreaElevation,
  restoreClippingAreaElevation,
  getClippingElevationInfo
} from '@/utils/cesium/elevation';

// 检查状态
const info = getClippingElevationInfo();
if (info.canAdjust) {
  // 抬升50米
  await adjustClippingAreaElevation(50);
  
  // 等待2秒
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // 下降25米
  await adjustClippingAreaElevation(-25);
  
  // 恢复原始高度
  if (info.canRestore) {
    await restoreClippingAreaElevation();
  }
}
```

### 2. 在Vue组件中使用

```vue
<template>
  <div class="elevation-controls">
    <button 
      @click="adjustHeight(50)"
      :disabled="!canAdjust"
    >
      抬升50米
    </button>
    
    <button 
      @click="adjustHeight(-50)"
      :disabled="!canAdjust"
    >
      下降50米
    </button>
    
    <button 
      @click="restoreHeight"
      :disabled="!canRestore"
    >
      恢复高度
    </button>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { 
  getClippingElevationInfo,
  adjustClippingAreaElevation,
  restoreClippingAreaElevation
} from '@/utils/cesium/elevation';

const canAdjust = ref(false);
const canRestore = ref(false);

// 更新状态
function updateStatus() {
  const info = getClippingElevationInfo();
  canAdjust.value = info.canAdjust;
  canRestore.value = info.canRestore;
}

// 调整高度
async function adjustHeight(offset) {
  try {
    await adjustClippingAreaElevation(offset);
    updateStatus();
  } catch (error) {
    console.error('高度调整失败:', error);
  }
}

// 恢复高度
async function restoreHeight() {
  try {
    await restoreClippingAreaElevation();
    updateStatus();
  } catch (error) {
    console.error('高度恢复失败:', error);
  }
}

// 定期更新状态
let statusInterval = null;

onMounted(() => {
  updateStatus();
  statusInterval = setInterval(updateStatus, 3000);
});

onUnmounted(() => {
  if (statusInterval) {
    clearInterval(statusInterval);
  }
});
</script>
```

### 3. 与裁切功能集成

```javascript
import { mineClipping, clearClipping } from '@/utils/cesium/clipping';
import { 
  hasActiveClipping,
  canAdjustElevation,
  adjustClippingAreaElevation
} from '@/utils/cesium/elevation';

// 创建裁切区域
function createClippingArea() {
  const mine = {
    boundary: [[116.0, 39.0], [116.1, 39.0], [116.1, 39.1], [116.0, 39.1]],
    minZ: 100
  };
  mineClipping(mine, true);
}

// 检查是否可以调整高度
function checkElevationStatus() {
  if (!hasActiveClipping()) {
    console.log('没有激活的裁切区域');
    return false;
  }
  
  const check = canAdjustElevation();
  if (!check.canAdjust) {
    console.log('无法调整高度:', check.reason);
    return false;
  }
  
  return true;
}

// 调整裁切区域内实体高度
async function adjustClippingAreaHeight() {
  if (!checkElevationStatus()) {
    return;
  }
  
  try {
    const results = await adjustClippingAreaElevation(50);
    console.log('高度调整结果:', results);
  } catch (error) {
    console.error('高度调整失败:', error);
  }
}
```

## 实体检测算法

### 点实体检测
- 通过`entity.position`获取位置点
- 使用射线法判断点是否在裁切多边形内

### 线实体检测
- 通过`entity.polyline.positions`获取顶点数组
- 检查是否有顶点在裁切多边形内
- 如果至少一个顶点在区域内，则认为线在裁切区域内

### 线体积实体检测
- 通过`entity.polyline.polylineVolume.positions`获取顶点数组
- 检查是否有顶点在裁切多边形内
- 如果至少一个顶点在区域内，则认为线体积在裁切区域内
- 注意：polylineVolume 是 polyline 的扩展属性，不是独立的实体类型

### 多边形实体检测
- 通过`entity.polygon.hierarchy.positions`获取顶点数组
- 检查是否有顶点在裁切多边形内
- 如果至少一个顶点在区域内，则认为多边形在裁切区域内

### Primitive实体检测
- **ModelPrimitive**：通过`getBoundingSphere()`获取包围球中心点
- **PointPrimitive**：通过`position`属性获取位置点
- **PolylinePrimitive**：通过`positions`数组获取顶点位置
- **PolygonPrimitive**：通过`positions`数组获取顶点位置
- **LabelPrimitive**：通过`position`属性获取位置点
- **EllipsoidPrimitive**：通过`center`属性获取中心点
- **BoxPrimitive**：通过`center`属性获取中心点
- **CylinderPrimitive**：通过`bottomCenter`属性获取底部中心点
- 如果Primitive有顶点在裁切多边形内，则认为在裁切区域内

### 其他实体检测
- 尝试通过`entity.position`获取位置点
- 如果无法获取位置点，则跳过该实体

## 性能优化

1. **批量处理**：大量实体分批处理，避免界面卡顿
2. **异步操作**：所有高度调整操作都是异步的
3. **错误隔离**：单个实体失败不影响整体操作
4. **状态缓存**：缓存裁切区域和实体信息，减少重复计算

## 注意事项

1. **裁切区域**：需要先创建裁切区域才能使用高度调整功能
2. **实体类型**：支持大多数Cesium实体类型，但某些特殊实体可能需要特殊处理
3. **性能影响**：调整大量实体时可能会有性能影响，建议分批处理
4. **错误处理**：所有操作都有错误处理，建议在生产环境中添加适当的错误提示

## 更新日志

### v1.3.0 (2026-03-09)
- ✅ 修复restoreEntityHeight函数，为polyline和polygon类型使用每个点的原始高度
- ✅ 实现restorePolylineHeight函数：为每个顶点单独恢复原始高度
- ✅ 实现restorePolygonHeight函数：为每个边界和孔洞顶点单独恢复原始高度
- ✅ 精确恢复：每个顶点都恢复到其原始高度，保持形状不变形
- ✅ 错误处理：处理顶点数量不匹配等边界情况

### v1.5.0 (2026-03-09)
- ✅ 新增对Primitive实体的支持（viewer.scene.primitives）
- ✅ 实现getPrimitivePosition函数：获取Primitive的位置（支持包围球、position、center等属性）
- ✅ 实现getPrimitivePositions函数：获取Primitive的顶点位置数组
- ✅ 实现getPrimitiveType函数：识别Primitive类型（Model、Point、Polyline、Polygon等）
- ✅ 实现isPrimitiveInPolygon函数：判断Primitive是否在裁切多边形内
- ✅ 在getEntitiesInClippingArea函数中添加对primitives的遍历和检测
- ✅ 更新文档说明，添加Primitive实体检测相关内容

### v1.4.0 (2026-03-09)
- ✅ 新增对线体积实体（polylineVolume）的支持
- ✅ 实现getPolylineVolumeHeights函数：获取线体积实体的所有顶点高度
- ✅ 实现adjustPolylineVolumeEntity函数：调整线体积实体的所有顶点高度
- ✅ 实现restorePolylineVolumeHeight函数：恢复线体积实体的所有顶点高度
- ✅ 支持线体积实体的批量高度调整和恢复
- ✅ 更新文档说明，添加线体积实体相关内容
- ✅ 修正检测逻辑：polylineVolume 是 entity.polyline 的属性，先检查 entity.polyline 再检查 polylineVolume

### v1.2.0 (2026-03-09)
- ✅ 修复getEntityHeight函数，返回每个点的高度而不是平均高度
- ✅ 线实体：返回所有顶点的高度数组
- ✅ 多边形实体：返回边界和孔洞的高度数组
- ✅ 点实体/模型实体：返回单个高度值
- ✅ 统一的高度信息数据结构，包含类型标识
- ✅ 更新adjustEntityHeight和restoreEntityHeight函数以处理新的数据结构

### v1.1.0 (2026-03-09)
- ✅ 修复getEntityHeight函数，支持polyline、polygon和model实体
- ✅ 实现线实体高度调整（通过调整所有顶点高度）
- ✅ 实现多边形实体高度调整（通过调整所有顶点高度）
- ✅ 优化高度计算算法，使用顶点平均高度作为参考
- ✅ 添加完整的高度调整测试

### v1.0.0 (2026-03-09)
- ✅ 初始版本发布
- ✅ 支持点、线、多边形实体检测
- ✅ 实现高度调整和恢复功能
- ✅ 添加完整的API文档和示例
- ✅ 修复线和多边形实体检测问题

## 技术支持

如有问题或建议，请参考：
1. 查看本文档
2. 检查示例代码
3. 查看测试文件
4. 联系开发团队
