# Label Config 使用示例

重构后的 `labelConfig.js` 提供了更加优雅和强大的标签配置管理功能。

## 主要改进

1. **提取通用属性**：将重复的配置项提取到基础配置中
2. **可配置的距离参数系统**：统一管理所有距离相关的参数
3. **增强的类型安全**：添加了参数验证和错误处理
4. **扩展的预设类型**：新增了 `SMALL` 和 `LARGE` 预设
5. **更丰富的 API**：提供了更多辅助函数

## 基本使用

### 导入模块
```javascript
import {
  getLabelConfig,
  LABEL_PRESETS,
  DISTANCE_CONFIG,
  enhanceLabelWithDistanceControl,
  createCustomLabelConfig,
  getAvailableLabelTypes,
  getLabelDefault
} from '@/utils/cesium/labelConfig';
```

### 1. 使用预设配置
```javascript
// 普通标签（默认）
const normalLabel = getLabelConfig(LABEL_PRESETS.NORMAL);

// 矿点标签（无距离控制）
const minePointLabel = getLabelConfig(LABEL_PRESETS.MINE_POINT);

// 深度标签
const depthLabel = getLabelConfig(LABEL_PRESETS.DEPTH);

// 水域标签
const waterLabel = getLabelConfig(LABEL_PRESETS.WATER);

// 小尺寸标签（新增）
const smallLabel = getLabelConfig(LABEL_PRESETS.SMALL);

// 大尺寸标签（新增）
const largeLabel = getLabelConfig(LABEL_PRESETS.LARGE);
```

### 2. 自定义配置
```javascript
// 自定义字体和颜色
const customLabel = getLabelConfig(LABEL_PRESETS.NORMAL, {
  font: '14px Arial',
  fillColor: CesiumColor.RED,
  outlineColor: CesiumColor.YELLOW
});

// 完全自定义
const fullyCustom = createCustomLabelConfig(
  {
    text: '自定义标签',
    font: '16px Arial',
    fillColor: CesiumColor.BLUE
  },
  {
    enableDistanceControl: true,
    distanceType: LABEL_PRESETS.WATER
  }
);
```

### 3. 增强现有配置
```javascript
// 为已有标签添加距离控制
const existingConfig = {
  text: '设备点',
  font: '12px sans-serif',
  fillColor: CesiumColor.WHITE
};

const enhancedConfig = enhanceLabelWithDistanceControl(
  existingConfig,
  LABEL_PRESETS.NORMAL
);
```

### 4. 使用距离配置常量
```javascript
// 调整全局距离参数
console.log('近处缩放距离:', DISTANCE_CONFIG.SCALE.NEAR_DISTANCE);
console.log('远处缩放距离:', DISTANCE_CONFIG.SCALE.FAR_DISTANCE);
console.log('透明度控制距离:', DISTANCE_CONFIG.TRANSLUCENCY.FAR_DISTANCE);

// 如果需要全局调整，可以直接修改 DISTANCE_CONFIG
// 注意：这会影响到所有使用预设的标签
```

### 5. 工具函数
```javascript
// 获取所有可用的标签类型
const allTypes = getAvailableLabelTypes();
console.log('可用标签类型:', allTypes);

// 获取默认配置值
const defaultFont = getLabelDefault('font');
const defaultOutlineWidth = getLabelDefault('outlineWidth');
```

## 实际应用示例

### 在地图组件中使用
```javascript
// 创建隧道标签
const tunnelLabel = viewer.entities.add({
  position: position,
  label: {
    text: tunnelName,
    verticalOrigin: VerticalOrigin.CENTER,
    horizontalOrigin: HorizontalOrigin.CENTER,
    eyeOffset: new Cartesian3(0, 0, -40),
    ...getLabelConfig(LABEL_PRESETS.NORMAL),
  }
});

// 创建矿点标签
const mineLabel = viewer.entities.add({
  position: minePosition,
  label: {
    text: mineName,
    ...getLabelConfig(LABEL_PRESETS.MINE_POINT, {
      pixelOffset: new Cartesian2(0, -60) // 自定义偏移
    }),
  }
});

// 创建深度标签（钻孔）
const depthLabel = viewer.entities.add({
  position: drillPosition,
  label: {
    text: `深度: ${depth}m`,
    ...getLabelConfig(LABEL_PRESETS.DEPTH),
  }
});
```

### 动态调整标签样式
```javascript
// 根据设备状态动态调整标签颜色
function createDeviceLabel(device) {
  const baseConfig = {
    text: device.name,
    font: '12px sans-serif'
  };

  // 根据设备状态选择不同的预设
  let presetType = LABEL_PRESETS.NORMAL;
  if (device.type === 'mine') {
    presetType = LABEL_PRESETS.MINE_POINT;
  } else if (device.type === 'water') {
    presetType = LABEL_PRESETS.WATER;
  }

  // 根据状态调整颜色
  const color = device.status === 'normal' 
    ? CesiumColor.GREEN 
    : CesiumColor.RED;

  return getLabelConfig(presetType, {
    ...baseConfig,
    fillColor: color
  });
}
```

## 优势总结

1. **代码复用性**：通过基础配置减少了重复代码
2. **可维护性**：距离参数集中管理，便于全局调整
3. **扩展性**：新增预设类型简单，不影响现有代码
4. **类型安全**：参数验证避免了运行时错误
5. **文档完善**：详细的 JSDoc 注释和示例

## 迁移指南

从旧版本迁移到新版本非常简单，因为保持了完全相同的 API 接口：

```javascript
// 旧代码（仍然工作）
const oldWay = getLabelConfig(LABEL_PRESETS.NORMAL);

// 新代码（推荐）
const newWay = getLabelConfig(LABEL_PRESETS.NORMAL, {
  // 可以添加自定义配置
});
```

所有现有代码无需修改即可正常工作，同时可以享受新功能带来的好处。
