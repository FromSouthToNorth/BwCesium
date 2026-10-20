/**
 * MQTT 公共工具函数
 * 提供 MQTT 模块中使用的通用功能
 */

import { formatToDateTime } from '@/utils/dateUtils'
import { message as antMessage } from 'ant-design-vue'
import { ungzip } from 'pako'

/**
 * 创建标准化日志记录器
 * @param {boolean} isDebug - 是否启用调试模式
 * @returns {Function} 日志记录函数
 */
export function createLogger(isDebug) {
  /**
   * 记录日志消息
   * @param {string} type - 消息类型
   * @param {any} data - 附加数据
   */
  return function logMessage(type, data = null) {
    if (!isDebug) return

    const timestamp = formatToDateTime(new Date())
    const prefix = `[MQTT][${timestamp}] ${type}:`

    if (data) {
      console.warn(prefix, data)
    } else {
      console.warn(prefix)
    }
  }
}

/**
 * 创建错误处理器
 * @param {boolean} isDebug - 是否启用调试模式
 * @returns {Function} 错误处理函数
 */
export function createErrorHandler(isDebug) {
  /**
   * 处理错误
   * @param {string} message - 错误消息
   * @param {Error} error - 错误对象
   */
  return function handleError(message, error) {
    console.error(`[MQTT Error] ${message}`, error)
    if (isDebug) {
      antMessage.error(message)
    }
  }
}

/**
 * 验证 MQTT 消息是否有效
 * @param {Buffer} message - 消息内容
 * @returns {boolean} 是否有效
 */
export function validateMessage(message) {
  return message && message.length > 0
}

/**
 * 解析 MQTT 消息内容
 * @param {Uint8Array} message - 消息内容(mqtt.js 5.16+ 传 plain Uint8Array,无 Buffer.toString)
 * @returns {Object} 解析后的消息对象
 * @throws {Error} 当消息解析失败时抛出错误
 */
export function parseMessage(message) {
  try {
    // 判断消息体是否压缩(gzip magic: 1F 8B)
    const isCompressed = message.length >= 2 && message[0] === 0x1F && message[1] === 0x8B

    // pako 3 移除了 to:'string' 选项,统一返回 Uint8Array,需手动解码
    const bytes = isCompressed ? ungzip(message) : message
    const messageString = new TextDecoder().decode(bytes)

    return JSON.parse(messageString)
  } catch (error: any) {
    throw new Error(`消息解析失败: ${error.message}`)
  }
}

/**
 * 从主题中提取策略 ID
 * @param {string} topic - MQTT 主题
 * @returns {string} 策略 ID
 */
export function extractStrategyId(topic) {
  const topics = topic.split('/')
  return topics[topics.length - 1]
}

/**
 * 验证响应数据是否有效
 * @param {Object} result - 响应结果
 * @returns {boolean} 数据是否有效
 */
export function verifyResponseData(result) {
  const { params } = result
  if (!params.data && !params.tab) {
    const id = extractStrategyId(result.topic)
    console.warn(`[MQTT Warning] ${id} 策略，没有查询到数据！`)
    return false
  }
  return true
}

/**
 * 构建 MQTT 客户端选项
 * @param {string} clientId - 客户端 ID
 * @param {string} caller - 调用者标识
 * @param {string} mineDesc - 矿描述
 * @param {string} token - 认证令牌
 * @returns {Object} MQTT 客户端选项
 */
export function buildClientOptions(clientId, caller, mineDesc, token) {
  const type = 'LastWill'
  const topic = `/${mineDesc}/Get/${clientId}/${type}`

  return {
    clientId,
    username: 'bowwell',
    password: 'bowwell',
    keepalive: 10,
    reconnectPeriod: 10000, // 两次重新连接之间的间隔（毫秒）
    connectTimeout: 30 * 1000, // 等待收到 CONNACK 的时间（毫秒）
    will: {
      topic,
      payload: JSON.stringify({
        type,
        token,
        clientId,
        caller,
      }),
    },
  }
}

/**
 * 构建 MQTT 代理 URL
 * @param {string} protocol - 当前协议（HTTP/HTTPS）
 * @param {string} host - 当前主机
 * @param {string} publicPath - 公共路径
 * @returns {string} MQTT 代理 URL
 */
export function buildBrokerUrl() {
  const { protocol, host } = window.location
  const pro = protocol === 'https:' ? 'wss:' : 'ws:'
  return `${pro}${host}${import.meta.env.VITE_PUBLIC_PATH}mqtt`
}
