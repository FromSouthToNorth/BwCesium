/**
 * MQTT 配置设置
 * 仅保留消息状态码与主题前缀;连接配置(账号等)见 .env 与 common.ts
 */

// ==================== 消息状态码配置 ====================

/**
 * 消息状态码映射表
 * 用于将服务器返回的状态码转换为对应的消息类型
 */
const messageStateCode = [
  { type: 'info' },    // 状态码: 11
  { type: 'success' }, // 状态码: 12
  { type: 'warning' }, // 状态码: 13
  { type: 'error' },   // 状态码: >13
]

export { messageStateCode }

// ==================== 主题配置 ====================

/**
 * 订阅主题前缀
 */
export const SUBSCRIBE = '/Data'

/**
 * 发布主题前缀
 */
export const PUBLISH = '/Get'
