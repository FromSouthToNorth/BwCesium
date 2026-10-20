import { getToken, getMineDesc } from '@/utils/auth'
import { HTTPS, WSS, WS } from '@/utils/mutationTypes'

/**
 * MQTT 配置设置
 * 包含 MQTT 连接、主题、消息状态码等配置信息
 */

// ==================== 消息状态码配置 ====================

/**
 * 消息状态码映射表
 * 用于将服务器返回的状态码转换为对应的消息类型
 * @see <a href="http://cloud.bowwell.com:32010/story-view-4222.html">详细文档</a>
 * @type {Array<{type: string}>}
 */
const messageStateCode = [
  { type: 'info' },    // 状态码: 11
  { type: 'success' }, // 状态码: 12
  { type: 'warning' }, // 状态码: 13
  { type: 'error' },   // 状态码: >13
]

export { messageStateCode }

/**
 * 根据状态码获取消息类型
 * @param {number} code - 状态码
 * @returns {string} 消息类型 ('info' | 'success' | 'warning' | 'error')
 */
export function getMessageTypeByCode(code) {
  const index = code - 11
  if (index < 0) return 'error'
  if (index >= messageStateCode.length) return 'error'
  return messageStateCode[index].type
}

/**
 * 获取消息状态码配置
 * @returns {Array<{type: string, code: number}>} 状态码配置数组
 */
export function getMessageStateCodes() {
  return messageStateCode.map((item, index) => ({
    type: item.type,
    code: 11 + index,
    description: getMessageTypeDescription(item.type),
  }))
}

/**
 * 获取消息类型描述
 * @param {string} type - 消息类型
 * @returns {string} 类型描述
 */
function getMessageTypeDescription(type) {
  const descriptions = {
    info: '信息消息',
    success: '成功消息',
    warning: '警告消息',
    error: '错误消息',
  }
  return descriptions[type] || '未知消息'
}

// ==================== 主题配置 ====================

/**
 * 订阅主题前缀
 * 用于订阅消息的主题前缀
 * @type {string}
 */
export const SUBSCRIBE = '/Data'

/**
 * 发布主题前缀
 * 用于发布消息的主题前缀
 * @type {string}
 */
export const PUBLISH = '/Get'

/**
 * 遗嘱消息类型
 * 客户端断开连接时发送的遗嘱消息类型
 * @type {string}
 */
export const LAST_WILL_TYPE = 'LastWill'

// ==================== 连接配置 ====================

/**
 * MQTT 连接认证配置
 * @type {Object}
 */
export const AUTH_CONFIG = {
  username: 'bowwell',
  password: 'bowwell',
}

/**
 * MQTT 连接参数配置
 * @type {Object}
 */
export const CONNECTION_CONFIG = {
  keepalive: 10,                    // 心跳间隔（秒）
  reconnectPeriod: 10000,           // 重新连接间隔（毫秒）
  connectTimeout: 30 * 1000,        // 连接超时时间（毫秒）
  clean: true,                      // 是否清理会话
  resubscribe: true,                // 重新连接时是否重新订阅
}


/**
 * 获取完整的订阅主题
 * @param {string} mineDesc - 矿描述
 * @param {string} clientId - 客户端 ID
 * @returns {string} 完整的订阅主题
 */
export function getFullSubscribeTopic(mineDesc, clientId) {
  return `/${mineDesc}${SUBSCRIBE}/${clientId}/#`
}

/**
 * 获取完整的发布主题
 * @param {string} mineDesc - 矿描述
 * @param {string} clientId - 客户端 ID
 * @returns {string} 完整的发布主题
 */
export function getFullPublishTopic(mineDesc, clientId) {
  return `/${mineDesc}${PUBLISH}/${clientId}`
}

/**
 * 获取遗嘱主题
 * @param {string} mineDesc - 矿描述
 * @param {string} clientId - 客户端 ID
 * @returns {string} 遗嘱主题
 */
export function getLastWillTopic(mineDesc, clientId) {
  return `/${mineDesc}${PUBLISH}/${clientId}/${LAST_WILL_TYPE}`
}

/**
 * 获取默认连接配置
 * @returns {Object} 默认连接配置
 */
export function getDefaultConnectionConfig() {
  return {
    ...AUTH_CONFIG,
    ...CONNECTION_CONFIG,
  }
}

/**
 * 验证连接配置是否有效
 * @param {Object} config - 连接配置
 * @returns {boolean} 是否有效
 */
export function isValidConnectionConfig(config) {
  return (
    config &&
    typeof config === 'object' &&
    config.username &&
    config.password &&
    typeof config.keepalive === 'number' &&
    config.keepalive > 0
  )
}

// ==================== 环境配置 ====================

/**
 * 获取当前环境配置
 * @returns {Object} 环境配置
 */
export function getEnvironmentConfig() {
  return {
    protocol: window.location.protocol,
    host: window.location.host,
    publicPath: import.meta.env.VITE_PUBLIC_PATH || '',
    productCode: import.meta.env.VITE_PRODUCT_CODE || 'unknown',
    isDevelopment: import.meta.env.DEV,
    isProduction: import.meta.env.PROD,
  }
}
