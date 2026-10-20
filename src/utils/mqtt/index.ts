import { Mqtt } from './Mqtt'

/**
 * MQTT 模块入口文件
 * 提供 MQTT 客户端的单例实例和初始化函数
 */

// ==================== MQTT 客户端实例 ====================

/**
 * MQTT 客户端单例实例
 * 默认启用调试模式
 * @type {Mqtt}
 */
export const mqtt = new Mqtt(true)

/**
 * MQTT 客户端 ID
 * 在客户端初始化后可用
 * @type {string}
 */
export const MQTT_CLIENT_ID = mqtt.clientId

// ==================== 初始化函数 ====================

/**
 * 初始化 MQTT 上下文
 * 创建连接并订阅通用主题
 * 会在连接成功后自动订阅
 * @throws {Error} 当初始化失败时抛出错误
 */
export function contextInit() {
  try {
    // 初始化 MQTT 连接
    mqtt.init()

    // 订阅通用主题（使用通配符）
    // 如果连接未建立，会自动在连接成功后的 connect 事件中订阅
    mqtt.subscribeCommon()

    console.debug('[MQTT] 上下文初始化完成', {
      clientId: mqtt.clientId,
      connected: mqtt.isConnected(),
    })
  } catch (error: any) {
    console.error('[MQTT] 上下文初始化失败', error)
    throw error
  }
}

/**
 * 安全初始化 MQTT 上下文
 * 不会抛出错误，而是返回初始化结果
 * @returns {Object} 初始化结果
 */
export function safeContextInit() {
  try {
    contextInit()
    return {
      success: true,
      clientId: mqtt.clientId,
      message: 'MQTT 上下文初始化成功',
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      message: 'MQTT 上下文初始化失败',
    }
  }
}

/**
 * 异步初始化 MQTT 连接
 * 等待连接建立后再订阅主题
 * @param {number} [timeout=30000] - 等待连接的超时时间（毫秒）
 * @returns {Promise<Object>} 初始化结果
 * @example
 * // 在应用启动时使用
 * const result = await initMqttAsync()
 * if (result.success) {
 *   console.log('MQTT 连接成功', result.clientId)
 * } else {
 *   console.error('MQTT 连接失败', result.error)
 * }
 */
export function initMqttAsync(timeout = 30000) {
  return new Promise((resolve) => {
    try {
      // 初始化 MQTT 连接
      mqtt.init()

      // 订阅通用主题
      mqtt.subscribeCommon()

      // 设置超时
      const timeoutId = setTimeout(() => {
        resolve({
          success: false,
          clientId: mqtt.clientId,
          message: 'MQTT 连接超时',
          error: `连接未在 ${timeout}ms 内建立`,
        })
      }, timeout)

      // 监听连接成功事件
      const checkConnection = setInterval(() => {
        if (mqtt.isConnected()) {
          clearTimeout(timeoutId)
          clearInterval(checkConnection)
          resolve({
            success: true,
            clientId: mqtt.clientId,
            message: 'MQTT 连接成功',
            connected: true,
          })
        }
      }, 100)
    } catch (error: any) {
      resolve({
        success: false,
        error: error.message,
        message: 'MQTT 初始化失败',
      })
    }
  })
}

/**
 * 等待 MQTT 连接建立
 * @param {number} [timeout=30000] - 等待超时时间（毫秒）
 * @returns {Promise<boolean>} 连接是否成功建立
 * @example
 * // 等待连接
 * const connected = await waitForMqttConnection(10000)
 * if (connected) {
 *   console.log('MQTT 已连接')
 * }
 */
export function waitForMqttConnection(timeout = 30000) {
  return new Promise((resolve) => {
    if (mqtt.isConnected()) {
      resolve(true)
      return
    }

    const timeoutId = setTimeout(() => {
      resolve(false)
    }, timeout)

    const checkConnection = setInterval(() => {
      if (mqtt.isConnected()) {
        clearTimeout(timeoutId)
        clearInterval(checkConnection)
        resolve(true)
      }
    }, 100)
  })
}

/**
 * 检查 MQTT 连接状态
 * @returns {Object} 连接状态信息
 */
export function checkMqttStatus() {
  return {
    isConnected: mqtt.isConnected(),
    clientId: mqtt.clientId,
    hasClient: !!mqtt.client,
    timestamp: new Date().toISOString(),
  }
}

/**
 * 重新连接 MQTT
 * @returns {boolean} 是否成功重新连接
 */
export function reconnectMqtt() {
  try {
    if (mqtt.client) {
      mqtt.client.reconnect()
      return true
    }
    return false
  } catch (error: any) {
    console.error('[MQTT] 重新连接失败', error)
    return false
  }
}

/**
 * 断开 MQTT 连接
 * @param {boolean} [force=false] - 是否强制断开
 */
export function disconnectMqtt(force = false) {
  if (mqtt.client) {
    mqtt.disconnect(force)
  }
}

// ==================== 工具函数 ====================

/**
 * 获取 MQTT 客户端实例
 * @returns {Mqtt} MQTT 客户端实例
 */
export function getMqttClient() {
  return mqtt
}

/**
 * 获取 MQTT 客户端 ID（安全版本）
 * 如果客户端未初始化，返回空字符串
 * @returns {string} 客户端 ID
 */
export function getSafeClientId() {
  return mqtt.clientId || ''
}

/**
 * 发布消息的快捷函数
 * @param {Object} message - 消息对象
 * @param {Function} [callback] - 回调函数
 * @returns {boolean} 是否成功发布
 */
export function publishMessage(message, callback) {
  try {
    mqtt.publish(message, callback)
    return true
  } catch (error: any) {
    console.error('[MQTT] 消息发布失败', error)
    return false
  }
}

// ==================== MQTT 状态监测函数 ====================

/**
 * 获取 MQTT 连接状态信息
 * 返回详细的连接状态、消息统计等信息
 * @returns {Object} MQTT 状态信息对象
 */
export function getMqttStatusInfo() {
  return mqtt.getStatusInfo()
}

/**
 * 显示 MQTT 连接状态弹窗
 * 使用 ant-design-vue Modal 组件显示当前的连接状态和消息统计
 * @example
 * // 在 Vue 组件中使用
 * import { showMqttStatusModal } from '@/utils/mqtt'
 * 
 * // 显示状态弹窗
 * showMqttStatusModal()
 */
export function showMqttStatusModal() {
  mqtt.showStatusModal()
}

/**
 * 重置 MQTT 消息统计
 * 清空发送、接收、错误消息的计数
 */
export function resetMqttStats() {
  mqtt.resetMessageStats()
}

/**
 * 获取 MQTT 连接时长（秒）
 * @returns {number} 连接时长，未连接时返回 0
 */
export function getMqttConnectionDuration() {
  return mqtt.getConnectionDuration()
}

// ==================== 高级状态监测函数 ====================

// ==================== 默认导出 ====================

/**
 * 默认导出 MQTT 客户端实例
 * 为了向后兼容
 */
export default mqtt
