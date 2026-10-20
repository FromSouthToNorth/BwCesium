import {
  Color as CesiumColor,
  buildModuleUrl,
  PinBuilder,
  Cartesian2,
  LabelStyle,
  HeightReference,
} from 'cesium';
import { getLabelConfig, LABEL_PRESETS } from './labelConfig';

// 使用常量配置
import { ICON_CONFIG } from './constants';

const ICON_URL = ICON_CONFIG.DEFAULT_URL;
const DEFAULT_ICON_SIZE = ICON_CONFIG.DEFAULT_SIZE;
const DEFAULT_COLOR = ICON_CONFIG.DEFAULT_COLOR;
const DEFAULT_NAME = ICON_CONFIG.DEFAULT_NAME;
const LABEL_OFFSET = ICON_CONFIG.LABEL_OFFSET;
const BACKGROUND_PADDING = ICON_CONFIG.BACKGROUND_PADDING;

/**
 * 替换图标URL中的占位符
 * @param {string} icon - 图标名称
 * @returns {string} 替换后的URL
 */
function replaceIcon(icon) {
  return ICON_URL.replace('ICON', icon);
}

/**
 * 获取标记图标URL
 * @param {string} key - 图标键
 * @returns {string} 图标URL
 */
function getMarkerIcon(key) {
  return replaceIcon(key);
}

/**
 * 创建图标标记
 * @param {Object} entity - 实体对象
 * @returns {Promise<void>}
 */
export async function createIconMarker(entity, key) {
  try {
    // 验证实体对象
    if (!entity || !entity.properties) {
      console.warn('Invalid entity or missing properties');
      return;
    }

    const properties = entity.properties.getValue();

    // 验证属性对象
    if (!properties) {
      console.warn('Entity properties is null or undefined');
      return;
    }

    const { color, icon, name, label } = properties;
    const _label = label || name;

    // 验证必要属性
    if (!icon) {
      console.warn('Icon property is missing');
      return;
    }

    // 验证颜色值
    const validColor = validateColor(color);
    const iconURL = getMarkerIcon(icon);

    if (!iconURL) {
      console.warn('Invalid icon URL');
      return;
    }

    const pinBuilder = new PinBuilder();

    try {
      const result = await pinBuilder.fromUrl(iconURL, validColor, DEFAULT_ICON_SIZE);
      entity.billboard = entity.billboard || {};
      entity.billboard.image = result.toDataURL();
      entity.label = buildLabel(_label || DEFAULT_NAME, key);
    } catch (error: any) {
      console.error('Failed to create icon from URL:', error);
    }
  } catch (error: any) {
    console.error('Error in createIconMarker:', error);
  }
}

/**
 * 验证颜色值，返回有效颜色或默认颜色
 * @param {string} color - 颜色名称
 * @returns {Object} Cesium颜色对象
 */
function validateColor(color) {
  if (!color || !CesiumColor[color]) {
    console.warn(`Invalid color: ${color}, using default color: ${DEFAULT_COLOR}`);
    return CesiumColor[DEFAULT_COLOR];
  }
  return CesiumColor[color];
}

/**
 * 构建标签配置
 * @param {string} name - 标签名称
 * @param {string} key - 标签所属类型
 * @returns {Object} 标签配置对象
 */
export function buildLabel(name, key) {
  // 参数验证
  if (typeof name !== 'string' && name != null) {
    throw new TypeError('name must be a string or null/undefined');
  }
  if (typeof key !== 'string') {
    throw new TypeError('key must be a string');
  }

  const baseConfig = {
    text: name || DEFAULT_NAME,
  };

  // MinePoint 类型使用完整背景样式，不需要距离控制
  if (key === 'MinePoint') {
    return {
      ...baseConfig,
      ...getLabelConfig(LABEL_PRESETS.MINE_POINT),
    };
  }

  // 其他类型使用普通标签配置，自动包含视距控制
  return {
    ...baseConfig,
    ...getLabelConfig(LABEL_PRESETS.NORMAL),
  };
}
