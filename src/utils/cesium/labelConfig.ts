import {
  NearFarScalar,
  DistanceDisplayCondition,
  Cartesian2,
  LabelStyle,
  Color as CesiumColor,
} from 'cesium';

/**
 * Label 配置系统
 * 提供统一、优雅的标签配置管理，支持预设类型和自定义配置
 */

// ==================== 常量定义 ====================

/**
 * 标签预设类型枚举
 * @enum {string}
 */
export const LABEL_PRESETS = {
  /** 主要矿点标签（如 MinePoint）：始终可见，不随距离变化 */
  MINE_POINT: 'minePoint',
  /** 普通标签（如隧道、设备点）：远距离逐渐透明，最远隐藏 */
  NORMAL: 'normal',
  /** 深度标签（如钻孔深度）：更遥远才隐藏，支持近距离缩放 */
  DEPTH: 'depth',
  /** 水域标签：中等可见范围，远距离半透明 */
  WATER: 'water',
  /** 小尺寸标签：用于小图标或次要信息 */
  SMALL: 'small',
  /** 大尺寸标签：用于重要标题或突出显示 */
  LARGE: 'large',
};

/**
 * 距离控制参数配置
 * 统一管理所有距离相关的参数，便于全局调整
 */
export const DISTANCE_CONFIG = {
  // 缩放距离参数（单位：米）
  SCALE: {
    NEAR_DISTANCE: 1200,      // 近处距离
    NEAR_SCALE: 1.2,          // 近处缩放比例
    FAR_DISTANCE: 6000,       // 远处距离
    FAR_SCALE: 0.35,          // 远处缩放比例
  },

  // 透明度距离参数（单位：米）
  TRANSLUCENCY: {
    NEAR_DISTANCE: 2000,      // 近处距离（完全可见）
    NEAR_ALPHA: 1.0,          // 近处透明度
    FAR_DISTANCE: 8000,       // 远处距离
    FAR_ALPHA: 0.0,           // 远处透明度
  },

  // 显示条件距离参数（单位：米）
  DISPLAY_CONDITION: {
    NEAR_DISTANCE: 0,         // 最近显示距离
    FAR_DISTANCE: 10000,      // 最远显示距离
  },

  // 特殊类型距离调整
  ADJUSTMENTS: {
    DEPTH: {
      FAR_SCALE: 0.3,         // 深度标签的远处缩放
    },
    WATER: {
      FAR_SCALE: 0.8,         // 水域标签的远处缩放
      FAR_ALPHA: 0.6,         // 水域标签的远处透明度
    },
    MINE_POINT: {
      // 矿点标签不使用距离控制
    },
  },
};

/**
 * 基础样式配置
 * 所有标签共享的基础样式，减少重复配置
 */
const BASE_STYLES = {
  COMMON: {
    fillColor: CesiumColor.WHITE,
    style: LabelStyle.FILL_AND_OUTLINE,
  },

  OUTLINE: {
    NORMAL: {
      outlineColor: CesiumColor.DIMGRAY,
      outlineWidth: 2,
    },
    BOLD: {
      outlineColor: CesiumColor.BLACK,
      outlineWidth: 6,
    },
  },

  FONT: {
    SMALL: '10px sans-serif',
    NORMAL: '12px sans-serif',
    BOLD: 'bold 12px Microsoft YaHei, sans-serif',
    LARGE: '14px sans-serif',
  },
};

/**
 * 预设配置生成器
 * 使用统一的配置生成逻辑，确保一致性
 */
const PRESET_GENERATORS = {
  /**
   * 生成距离控制配置
   * @param {Object} adjustments - 距离调整参数
   * @returns {Object} 距离控制配置对象
   */
  createDistanceControl(adjustments = {}) {
    const {
      farScale = DISTANCE_CONFIG.SCALE.FAR_SCALE,
      farAlpha = DISTANCE_CONFIG.TRANSLUCENCY.FAR_ALPHA,
    } = adjustments;

    return {
      scaleByDistance: new NearFarScalar(
        DISTANCE_CONFIG.SCALE.NEAR_DISTANCE,
        DISTANCE_CONFIG.SCALE.NEAR_SCALE,
        DISTANCE_CONFIG.SCALE.FAR_DISTANCE,
        farScale
      ),
      translucencyByDistance: new NearFarScalar(
        DISTANCE_CONFIG.TRANSLUCENCY.NEAR_DISTANCE,
        DISTANCE_CONFIG.TRANSLUCENCY.NEAR_ALPHA,
        DISTANCE_CONFIG.TRANSLUCENCY.FAR_DISTANCE,
        farAlpha
      ),
      distanceDisplayCondition: new DistanceDisplayCondition(
        DISTANCE_CONFIG.DISPLAY_CONDITION.NEAR_DISTANCE,
        DISTANCE_CONFIG.DISPLAY_CONDITION.FAR_DISTANCE
      ),
    };
  },

  /**
   * 生成无距离控制的配置
   * @returns {Object} 无距离控制的配置对象
   */
  createNoDistanceControl() {
    return {
      // 无距离控制配置
    };
  },
};

// ==================== 预设配置 ====================

/**
 * 预设配置映射
 * 使用统一的配置生成逻辑，避免硬编码
 */
const PRESET_CONFIGS = {
  [LABEL_PRESETS.MINE_POINT]: {
    font: BASE_STYLES.FONT.BOLD,
    ...BASE_STYLES.COMMON,
    ...BASE_STYLES.OUTLINE.BOLD,
    pixelOffset: new Cartesian2(0, -48),
    ...PRESET_GENERATORS.createNoDistanceControl(),
  },

  [LABEL_PRESETS.NORMAL]: {
    font: BASE_STYLES.FONT.NORMAL,
    ...BASE_STYLES.COMMON,
    ...BASE_STYLES.OUTLINE.NORMAL,
    ...PRESET_GENERATORS.createDistanceControl(),
  },

  [LABEL_PRESETS.DEPTH]: {
    font: BASE_STYLES.FONT.SMALL,
    ...BASE_STYLES.COMMON,
    ...BASE_STYLES.OUTLINE.NORMAL,
    ...PRESET_GENERATORS.createDistanceControl({
      farScale: DISTANCE_CONFIG.ADJUSTMENTS.DEPTH.FAR_SCALE,
    }),
  },

  [LABEL_PRESETS.WATER]: {
    font: BASE_STYLES.FONT.NORMAL,
    ...BASE_STYLES.COMMON,
    ...BASE_STYLES.OUTLINE.NORMAL,
    ...PRESET_GENERATORS.createDistanceControl({
      farScale: DISTANCE_CONFIG.ADJUSTMENTS.WATER.FAR_SCALE,
      farAlpha: DISTANCE_CONFIG.ADJUSTMENTS.WATER.FAR_ALPHA,
    }),
  },

  [LABEL_PRESETS.SMALL]: {
    font: BASE_STYLES.FONT.SMALL,
    ...BASE_STYLES.COMMON,
    ...BASE_STYLES.OUTLINE.NORMAL,
    ...PRESET_GENERATORS.createDistanceControl({
      farScale: 0.25, // 小标签更小的远处缩放
    }),
  },

  [LABEL_PRESETS.LARGE]: {
    font: BASE_STYLES.FONT.LARGE,
    ...BASE_STYLES.COMMON,
    ...BASE_STYLES.OUTLINE.BOLD,
    ...PRESET_GENERATORS.createDistanceControl({
      farScale: 0.5, // 大标签更大的远处缩放
      farAlpha: 0.3, // 大标签更远的可见距离
    }),
  },
};

// ==================== 工具函数 ====================

/**
 * 验证标签类型是否有效
 * @param {string} type - 标签类型
 * @returns {boolean} 是否有效
 */
function isValidLabelType(type) {
  return Object.values(LABEL_PRESETS).includes(type);
}

/**
 * 验证自定义配置对象
 * @param {Object} config - 自定义配置
 * @returns {boolean} 是否有效
 */
function isValidCustomConfig(config) {
  return config && typeof config === 'object' && !Array.isArray(config);
}

// ==================== 主要 API ====================

/**
 * 获取标签配置
 * @param {string} [type=LABEL_PRESETS.NORMAL] - 标签类型，使用 LABEL_PRESETS 中的值
 * @param {Object} [customConfig={}] - 自定义配置，将与预设合并
 * @returns {Object} Cesium 标签配置对象
 * @throws {Error} 当类型或配置无效时抛出错误
 * 
 * @example
 * // 基本使用
 * const config = getLabelConfig(LABEL_PRESETS.NORMAL);
 * 
 * @example
 * // 自定义配置
 * const config = getLabelConfig(LABEL_PRESETS.NORMAL, {
 *   fillColor: CesiumColor.RED,
 *   font: '14px Arial'
 * });
 * 
 * @example
 * // 使用新预设类型
 * const config = getLabelConfig(LABEL_PRESETS.SMALL);
 */
export function getLabelConfig(type = LABEL_PRESETS.NORMAL, customConfig = {}) {
  // 参数验证
  if (!isValidLabelType(type)) {
    console.warn(`无效的标签类型: ${type}，将使用默认类型: ${LABEL_PRESETS.NORMAL}`);
    type = LABEL_PRESETS.NORMAL;
  }

  if (!isValidCustomConfig(customConfig)) {
    throw new Error('customConfig 必须是一个有效的对象');
  }

  // 获取基础配置
  const baseConfig = PRESET_CONFIGS[type] || PRESET_CONFIGS[LABEL_PRESETS.NORMAL];

  // 合并配置（自定义配置优先）
  return {
    ...baseConfig,
    ...customConfig,
  };
}

/**
 * 为已有标签添加距离控制
 * @param {Object} labelConfig - 已有的标签配置对象
 * @param {string} [type=LABEL_PRESETS.NORMAL] - 标签类型预设
 * @returns {Object} 增强后的标签配置
 * 
 * @example
 * // 增强现有标签配置
 * const enhancedConfig = enhanceLabelWithDistanceControl(
 *   existingConfig,
 *   LABEL_PRESETS.NORMAL
 * );
 */
export function enhanceLabelWithDistanceControl(labelConfig = {}, type = LABEL_PRESETS.NORMAL) {
  if (!isValidCustomConfig(labelConfig)) {
    throw new Error('labelConfig 必须是一个有效的对象');
  }

  const distanceConfig = getLabelConfig(type);

  // 只添加距离控制相关的配置
  return {
    ...labelConfig,
    scaleByDistance: distanceConfig.scaleByDistance,
    translucencyByDistance: distanceConfig.translucencyByDistance,
    distanceDisplayCondition: distanceConfig.distanceDisplayCondition,
  };
}

/**
 * 创建自定义标签配置
 * @param {Object} baseConfig - 基础配置
 * @param {Object} options - 自定义选项
 * @returns {Object} 自定义标签配置
 * 
 * @example
 * // 创建完全自定义的标签配置
 * const customLabel = createCustomLabelConfig({
 *   font: '16px Arial',
 *   fillColor: CesiumColor.BLUE
 * }, {
 *   enableDistanceControl: true,
 *   distanceType: LABEL_PRESETS.NORMAL
 * });
 */
export function createCustomLabelConfig(baseConfig = {}, options = {}) {
  const {
    enableDistanceControl = true,
    distanceType = LABEL_PRESETS.NORMAL,
    ...otherOptions
  } = options;

  let config = { ...baseConfig, ...otherOptions };

  if (enableDistanceControl) {
    config = enhanceLabelWithDistanceControl(config, distanceType);
  }

  return config;
}

/**
 * 获取所有可用的标签预设类型
 * @returns {Array<string>} 预设类型数组
 */
export function getAvailableLabelTypes() {
  return Object.values(LABEL_PRESETS);
}

/**
 * 获取标签配置的默认值
 * @param {string} property - 配置属性名
 * @returns {*} 属性默认值
 */
export function getLabelDefault(property) {
  const defaults = {
    font: BASE_STYLES.FONT.NORMAL,
    fillColor: CesiumColor.WHITE,
    outlineColor: CesiumColor.DIMGRAY,
    outlineWidth: 2,
    style: LabelStyle.FILL_AND_OUTLINE,
  };

  return defaults[property];
}
