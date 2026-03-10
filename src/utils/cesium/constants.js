import { Cartesian2, Color as CesiumColor } from 'cesium';

/**
 * Cesium 相关常量配置
 */

// 图标配置
export const ICON_CONFIG = {
  DEFAULT_URL: '/src/assets/markerIcon/ICON.svg',
  DEFAULT_SIZE: 36,
  DEFAULT_COLOR: 'WHITE',
  DEFAULT_NAME: '',
  LABEL_OFFSET: new Cartesian2(0, -56),
  BACKGROUND_PADDING: new Cartesian2(8, 6),
};

// 地图配置
export const MAP_CONFIG = {
  ION_TOKEN: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJiNGNkZmExNi1iNGFjLTRmMWQtYTk0YS1kZDA0YThjODg0YWEiLCJpZCI6MTIzMzI5LCJpYXQiOjE3NTI2NTYwMDV9.AGrRQMfnLy7_rqCkCqt0ESx3NX3ulhfOZLv-sDZB-vA',
  MAP_TILE_KEY: 'pk.eyJ1IjoiY3VzX2JrMW02aTdwIiwiYSI6IjRocW0wc2Q2ZTU4YmQ0OGE0YzAxZ3JpMXkiLCJ0Ijo0fQ.Q7HSLvVSwAvopYRcvaViOyeiV42zf9Lheydl_L2edWs',
};

// 聚类配置
export const CLUSTER_CONFIG = {
  PIXEL_RANGE: 15,
  MINIMUM_CLUSTER_SIZE: 3,
  ENABLED: true,
  COUNT_THRESHOLDS: [
    { threshold: 100, color: CesiumColor.RED },
    { threshold: 60, color: CesiumColor.YELLOW },
    { threshold: 0, color: CesiumColor.GREEN },
  ],
  PIN_SIZES: [48, 32],
};

// 飞行动画配置
export const FLY_TO_CONFIG = {
  DEFAULT_DURATION: 3, // 秒
  DEFAULT_PAD: 0.01, // 边界填充
  DEFAULT_HEIGHT: 6000, // 默认高度（米）
};

// 几何计算配置
export const GEOMETRY_CONFIG = {
  DEFAULT_HEIGHT_OFFSET: 2, // 默认高度偏移（米）
  CIRCLE_SEGMENTS: 360, // 圆的分段数
};

// 标签配置（与 labelConfig.js 配合使用）
export const LABEL_CONFIG = {
  DEFAULT_FONT: '12px sans-serif',
  DEFAULT_COLOR: CesiumColor.WHITE,
  DEFAULT_OUTLINE_COLOR: CesiumColor.DIMGRAY,
  DEFAULT_OUTLINE_WIDTH: 2,
};

// 线样式配置
export const LINE_CONFIG = {
  DEFAULT_WIDTH: 12,
  DEFAULT_COLOR: '#ffffff',
  ARROW_MATERIAL: true,
};

// 模型配置
export const MODEL_CONFIG = {
  DEFAULT_SCALE: 1.0,
  DEFAULT_SILHOUETTE_COLOR: CesiumColor.RED,
  DEFAULT_SILHOUETTE_SIZE: 3,
  UP_AXIS: 'Y',
  FORWARD_AXIS: 'X',
};

// 圆柱体配置（用于钻孔等）
export const CYLINDER_CONFIG = {
  DEFAULT_RADIUS: 1.5,
  DEFAULT_OUTLINE_WIDTH: 1,
  DEFAULT_OUTLINE_ALPHA: 0.5,
  DEFAULT_MATERIAL_ALPHA: 0.6,
};

// 水域配置
export const WATER_AREA_CONFIG = {
  DEFAULT_HEIGHT: 0,
  DEFAULT_ALPHA: 0.5,
};

// 错误处理配置
export const ERROR_CONFIG = {
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 毫秒
  SHOW_USER_ERRORS: true,
};

// 性能配置
export const PERFORMANCE_CONFIG = {
  ENTITY_VISIBILITY_CHECK_INTERVAL: 100, // 毫秒
  MAX_ENTITIES_PER_FRAME: 1000,
  ENABLE_FRUSTUM_CULLING: true,
};
