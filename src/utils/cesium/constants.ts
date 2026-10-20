import { Cartesian2, Color as CesiumColor } from 'cesium'

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
}

// 地图配置(token 经 .env 注入,默认值保留内网 Cesium Ion/Mapbox key)
export const MAP_CONFIG = {
  ION_TOKEN: import.meta.env.VITE_CESIUM_ION_TOKEN,
  MAP_TILE_KEY: import.meta.env.VITE_MAP_TILE_KEY,
}

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
}

// 飞行动画配置
export const FLY_TO_CONFIG = {
  DEFAULT_DURATION: 3, // 秒
  DEFAULT_PAD: 0.01, // 边界填充
  DEFAULT_HEIGHT: 6000, // 默认高度（米）
}

// 几何计算配置
export const GEOMETRY_CONFIG = {
  DEFAULT_HEIGHT_OFFSET: 2, // 默认高度偏移（米）
  CIRCLE_SEGMENTS: 360, // 圆的分段数
}

// 模型配置
export const MODEL_CONFIG = {
  DEFAULT_SCALE: 1.0,
  DEFAULT_SILHOUETTE_COLOR: CesiumColor.RED,
  DEFAULT_SILHOUETTE_SIZE: 3,
  UP_AXIS: 'Y',
  FORWARD_AXIS: 'X',
  // 巷道模型(OBJ+MTL)服务地址：相对路径走代理，{MineDesc} 为矿井代码占位符
  TUNNEL_MODEL_URL: '/bwmodel/Content/Resource/ObjModel/{MineDesc}/XD.obj',
  TUNNEL_MODEL_MTL_URL: '/bwmodel/Content/Resource/ObjModel/{MineDesc}/XD.mtl',
  // 转换导出时贴图的最大边长，控制转换耗时与产物体积
  TUNNEL_TEXTURE_MAX_SIZE: 2048,
}

// 裁切配置
export const CLIPPING_CONFIG = {
  // 墙体地形采样层级：固定层级整片区域只需少量瓦片，最精细采样会拉取覆盖区的全部深层瓦片（上千个外网请求）
  TERRAIN_SAMPLE_LEVEL: 14,
  // 指定层级采样全部失败时的降级重试层级
  TERRAIN_RETRY_LEVEL: 10,
  // 墙体构建整体超时（毫秒），超时后裁切先生效，墙体后续补齐
  WALL_BUILD_TIMEOUT: 15_000,
  // 墙体底边相对采样高度的抬升量（米），抵消低层级采样误差，防止墙体顶边陷入地形出现缝隙
  WALL_TERRAIN_BIAS: 2,
}

// 圆柱体配置（用于钻孔等）
export const CYLINDER_CONFIG = {
  DEFAULT_RADIUS: 1.5,
  DEFAULT_OUTLINE_WIDTH: 1,
  DEFAULT_OUTLINE_ALPHA: 0.5,
  DEFAULT_MATERIAL_ALPHA: 0.6,
}

// 水域配置
export const WATER_AREA_CONFIG = {
  DEFAULT_HEIGHT: 0,
  DEFAULT_ALPHA: 0.5,
}
