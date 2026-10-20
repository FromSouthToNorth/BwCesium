import { Mqtt } from './Mqtt'

/**
 * MQTT 模块入口文件
 * 提供 MQTT 客户端的单例实例和初始化函数
 * 消息发布请使用 ./publish(经 publishMessage 统一走全局参数合并)
 */

// ==================== MQTT 客户端实例 ====================

/**
 * MQTT 客户端单例实例
 * 默认启用调试模式
 */
export const mqtt = new Mqtt(true)

// ==================== 初始化函数 ====================

/**
 * 初始化 MQTT 上下文
 * 创建连接并订阅通用主题,连接成功后会自动订阅
 * @throws {Error} 当初始化失败时抛出错误
 */
export function contextInit() {
  try {
    // 初始化 MQTT 连接
    mqtt.init()

    // 订阅通用主题(使用通配符)
    // 如果连接未建立,会在连接成功后的 connect 事件中订阅
    mqtt.subscribeCommon()

    console.debug('[MQTT] 上下文初始化完成', {
      clientId: mqtt.clientId,
      connected: mqtt.isConnected(),
    })
  } catch (error) {
    console.error('[MQTT] 上下文初始化失败', error)
    throw error
  }
}

// ==================== 默认导出 ====================

/**
 * 默认导出 MQTT 客户端实例
 * 为了向后兼容
 */
export default mqtt
