/**
 * MQTT 消息类型常量定义
 * 用于标识不同的 MQTT 消息处理策略
 */

// ==================== 集团矿井相关 ====================

/**
 * 集团矿井层级信息
 * @type {string}
 */
export const GROUP_COMPANY_LEVEL_MINE = 'groupCompanyLevelMine'

/**
 * 默认消息类型
 * @type {string}
 */
export const DEFAULT_TYPE = 'defaultType'

/**
 * 提示消息
 * @type {string}
 */
export const PROMPT_MESSAGE = 'promptMessage'

// ==================== 公司运维界面功能 ====================

/**
 * 通用项目统计
 * @type {string}
 */
export const COMMON_ITEMS_STAT = 'commonItemsStat'

/**
 * 集团公司上下文菜单项
 * @type {string}
 */
export const GROUP_COMPANY_CONTEXTMENU_ITEMS = 'groupCompanyContextmenuItems'

// ==================== 地理数据相关 ====================

/**
 * 隧道线字符串数据
 * @type {string}
 */
export const TUNNEL_LINE_STRING = 'TunnelLineString'

/**
 * 设备点数据
 * @type {string}
 */
export const DEVICE_POINT = 'DevicePoint'

/**
 * 地面孔洞数据
 * @type {string}
 */
export const GROUND_HOLE = 'GroundHole'

/**
 * 水域数据
 * @type {string}
 */
export const WATER_AREA = 'WaterArea'

/**
 * 遍历边界数据
 * @type {string}
 */
export const TRAVERSE_BOUNDARY = 'TraverseBoundary'

// ==================== 类型分组（便于使用） ====================

/**
 * 所有消息类型的数组
 * @type {string[]}
 */
export const ALL_MESSAGE_TYPES = [
  GROUP_COMPANY_LEVEL_MINE,
  DEFAULT_TYPE,
  PROMPT_MESSAGE,
  COMMON_ITEMS_STAT,
  GROUP_COMPANY_CONTEXTMENU_ITEMS,
  TUNNEL_LINE_STRING,
  DEVICE_POINT,
  GROUND_HOLE,
  WATER_AREA,
  TRAVERSE_BOUNDARY,
]

/**
 * 集团矿井相关消息类型
 * @type {string[]}
 */
export const GROUP_COMPANY_TYPES = [
  GROUP_COMPANY_LEVEL_MINE,
  GROUP_COMPANY_CONTEXTMENU_ITEMS,
]

/**
 * 地理数据相关消息类型
 * @type {string[]}
 */
export const GEO_DATA_TYPES = [
  TUNNEL_LINE_STRING,
  DEVICE_POINT,
  GROUND_HOLE,
  WATER_AREA,
  TRAVERSE_BOUNDARY,
]

/**
 * 运维功能相关消息类型
 * @type {string[]}
 */
export const OPERATION_TYPES = [
  COMMON_ITEMS_STAT,
]

/**
 * 系统消息类型
 * @type {string[]}
 */
export const SYSTEM_TYPES = [
  DEFAULT_TYPE,
  PROMPT_MESSAGE,
]

/**
 * 根据消息类型获取分类
 * @param {string} type - 消息类型
 * @returns {string} 分类名称
 */
export function getTypeCategory(type) {
  if (GROUP_COMPANY_TYPES.includes(type)) return '集团矿井'
  if (GEO_DATA_TYPES.includes(type)) return '地理数据'
  if (OPERATION_TYPES.includes(type)) return '运维功能'
  if (SYSTEM_TYPES.includes(type)) return '系统消息'
  return '其他'
}

/**
 * 验证消息类型是否有效
 * @param {string} type - 消息类型
 * @returns {boolean} 是否有效
 */
export function isValidMessageType(type) {
  return ALL_MESSAGE_TYPES.includes(type)
}

/**
 * 获取所有消息类型的描述映射
 * @returns {Object} 类型描述映射表
 */
export function getTypeDescriptions() {
  return {
    [GROUP_COMPANY_LEVEL_MINE]: '集团矿井层级信息',
    [DEFAULT_TYPE]: '默认消息类型',
    [PROMPT_MESSAGE]: '提示消息',
    [COMMON_ITEMS_STAT]: '通用项目统计',
    [GROUP_COMPANY_CONTEXTMENU_ITEMS]: '集团公司上下文菜单项',
    [TUNNEL_LINE_STRING]: '隧道线字符串数据',
    [DEVICE_POINT]: '设备点数据',
    [GROUND_HOLE]: '地面孔洞数据',
    [WATER_AREA]: '水域数据',
    [TRAVERSE_BOUNDARY]: '遍历边界数据',
  }
}
