# 裁切区域高度调整对话框

## 功能概述

该组件提供了一个对话框界面，用于调整当前裁切区域内所有实体的相对高度。支持抬升和下降操作，并可以恢复原始高度。

## 核心特性

1. **自动检测裁切区域**：自动识别当前激活的裁切多边形
2. **实体统计**：显示裁切区域内的实体数量和类型分布
3. **高度调整**：支持相对高度调整（正数为抬升，负数为下降）
4. **实时预览**：可预览高度调整效果（需实现）
5. **高度恢复**：支持恢复实体的原始高度
6. **批量操作**：支持批量调整大量实体

## 使用方法

### 基本使用

```vue
<template>
  <div>
    <button @click="openDialog">打开高度调整对话框</button>
    <ClippingElevationDialog v-model:open="dialogVisible" />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import ClippingElevationDialog from '@/components/ClippingElevationDialog'

const dialogVisible = ref(false)

function openDialog() {
  dialogVisible.value = true
}
</script>
```

### 使用组合式API

```vue
<template>
  <div>
    <button @click="openDialog">打开高度调整对话框</button>
    <ClippingElevationDialog v-model:open="elevation.dialogVisible" />
  </div>
</template>

<script setup>
import { useClippingElevation } from '@/components/ClippingElevationDialog/src/useClippingElevation'

const elevation = useClippingElevation()

function openDialog() {
  elevation.openDialog()
}
</script>
```

### 编程式调用

```javascript
import { adjustClippingAreaElevation, restoreClippingAreaElevation } from '@/utils/cesium/elevation'

// 调整高度
async function adjustHeight() {
  try {
    const results = await adjustClippingAreaElevation(50) // 抬升50米
    console.log('调整结果:', results)
  } catch (error) {
    console.error('调整失败:', error)
  }
}

// 恢复高度
async function restoreHeight() {
  try {
    const results = await restoreClippingAreaElevation()
    console.log('恢复结果:', results)
  } catch (error) {
    console.error('恢复失败:', error)
  }
}
```

## API 文档

### 组件 Props

| 属性名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| open | Boolean | false | 控制对话框显示/隐藏 |

### 组件 Events

| 事件名 | 参数 | 说明 |
|--------|------|------|
| update:open | (value: boolean) | 对话框显示状态变化 |
| applied | (results: Object) | 高度调整完成 |
| restored | (results: Object) | 高度恢复完成 |
| cancel | () | 对话框取消 |

### 工具函数

#### `adjustClippingAreaElevation(offset: number): Promise<Object>`
调整当前裁切区域内所有实体的高度。

**参数：**
- `offset`: 高度偏移量（米），正数为抬升，负数为下降

**返回值：**
```javascript
{
  total: number,      // 总实体数
  success: number,    // 成功调整数
  failed: number,     // 失败数
  details: Array,     // 详细结果
  duration: number    // 操作耗时（毫秒）
}
```

#### `restoreClippingAreaElevation(): Promise<Object>`
恢复当前裁切区域内所有实体的原始高度。

**返回值：**
```javascript
{
  total: number,      // 总实体数
  restored: number,   // 成功恢复数
  failed: number,     // 失败数
  details: Array,     // 详细结果
  duration: number    // 操作耗时（毫秒）
}
```

#### `getClippingElevationInfo(): Object`
获取当前裁切区域的高度调整信息。

**返回值：**
```javascript
{
  hasClipping: boolean,           // 是否有激活的裁切
  clippingInfo: Object,           // 裁切区域信息
  entityStats: Object,            // 实体统计信息
  heightStats: Object,            // 高度调整统计
  canAdjust: boolean,             // 是否可以调整
  canRestore: boolean             // 是否可以恢复
}
```

#### `canAdjustElevation(): Object`
检查是否可以进行高度调整。

#### `canRestoreElevation(): Object`
检查是否可以进行高度恢复。

## 支持实体类型

- ✅ 点实体（billboard, point）
- ✅ 线实体（polyline）
- ✅ 面实体（polygon）
- ✅ 模型实体（model）
- ✅ 标签实体（label）
- ✅ 圆柱体（cylinder）
- ✅ 盒子（box）
- ✅ 椭球体（ellipsoid）
- ✅ GeoJsonDataSource中的实体

## 集成说明

### 与现有裁切功能集成

该组件设计为与现有的裁切功能（`clipping.js`）深度集成。当用户创建裁切区域后，可以立即使用高度调整功能。

### 性能考虑

1. **批量处理**：大量实体时采用分批处理，避免界面卡顿
2. **原始高度缓存**：保存原始高度用于撤销操作
3. **错误恢复**：单个实体失败不影响整体操作

### 注意事项

1. 需要先创建裁切区域才能使用高度调整功能
2. 实时预览功能需要额外实现（当前为占位符）
3. 高度调整会影响所有在裁切区域内的实体，包括GeoJsonDataSource中的实体

## 开发计划

### 已完成
- [x] 基础框架搭建
- [x] 裁切区域集成
- [x] 实体选择器
- [x] 高度调整器
- [x] 对话框UI组件
- [x] 组合式API

### 待完成
- [ ] 实时预览功能实现
- [ ] 撤销/重做功能
- [ ] 性能优化
- [ ] 单元测试
- [ ] 集成测试

## 故障排除

### 常见问题

1. **对话框显示"没有激活的裁切区域"**
   - 确保已使用裁切功能创建了裁切区域
   - 检查裁切区域是否已启用（enabled: true）

2. **高度调整失败**
   - 检查实体是否在裁切区域内
   - 确认实体类型是否支持高度调整
   - 查看控制台错误信息

3. **性能问题**
   - 大量实体时建议分批处理
   - 考虑使用Web Worker进行后台处理

### 调试建议

```javascript
// 检查裁切区域状态
import { getClippingElevationInfo } from '@/utils/cesium/elevation'
console.log('裁切区域信息:', getClippingElevationInfo())

// 检查实体统计
import { getEntityStatistics } from '@/utils/cesium/elevation'
const polygon = getActiveClippingPolygon()
if (polygon) {
  console.log('实体统计:', getEntityStatistics(polygon))
}
```

## 版本历史

### v1.0.0 (初始版本)
- 基础高度调整功能
- 裁切区域集成
- 对话框UI组件
- 批量操作支持
