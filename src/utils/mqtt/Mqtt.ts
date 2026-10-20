import mqtt from 'mqtt'
import { SUBSCRIBE, PUBLISH } from './settings'
import { getToken, getMineDesc } from '@/utils/auth'
import { mqttFun } from './strategies'
import { v4 as uuidv4 } from 'uuid'
import { message as antMessage, Modal } from 'ant-design-vue'
import {
  createLogger,
  createErrorHandler,
  validateMessage,
  parseMessage,
  buildClientOptions,
  buildBrokerUrl,
} from './common'

/**
 * MQTT 客户端类
 * 提供 MQTT 连接管理、消息发布/订阅、错误处理等功能
 */
class Mqtt {
  /**
   * 客户端 ID
   * @type {string}
   */
  clientId

  /**
   * 是否启用调试模式
   * @type {boolean}
   */
  isDebug

  /**
   * 调用者标识
   * @type {string}
   */
  caller

  /**
   * MQTT 客户端实例
   * @type {mqtt.Client}
   */
  client

  /**
   * 日志记录函数
   * @type {Function}
   * @private
   */
  logMessage

  /**
   * 错误处理函数
   * @type {Function}
   * @private
   */
  handleError

  /**
   * 消息统计信息
   * @type {Object}
   * @private
   */
  messageStats = {
    sent: 0,
    received: 0,
    errors: 0,
  }

  /**
   * 连接时间
   * @type {Date|null}
   * @private
   */
  connectionTime: any = null

  /**
   * 自动订阅主题列表
   * @type {string[]}
   * @private
   */
  autoSubscribedTopics: any[] = []

  /**
   * 连接状态
   * @type {boolean}
   * @private
   */
  _isConnected = false

  /**
   * 创建 MQTT 客户端实例
   * @param {boolean} isDebug - 是否启用调试模式
   * @param {string} [caller] - 调用者标识，默认为环境变量 VITE_PRODUCT_CODE
   */
  constructor(isDebug, caller: any = null) {
    this.isDebug = isDebug
    this.caller = caller || import.meta.env.VITE_PRODUCT_CODE

    // 初始化工具函数
    this.logMessage = createLogger(isDebug)
    this.handleError = createErrorHandler(isDebug)
  }

  /**
   * 初始化 MQTT 连接
   * @throws {Error} 当连接初始化失败时抛出错误
   */
  init() {
    try {
      // 生成唯一客户端 ID
      this.clientId = uuidv4()

      // 获取认证信息
      const token = getToken()
      const mineDesc = getMineDesc()

      // 构建连接选项
      const options = buildClientOptions(this.clientId, this.caller, mineDesc, token)
      const url = buildBrokerUrl()

      // 创建 MQTT 连接
      this.client = mqtt.connect(url, options)

      // 设置事件监听器
      this.setupEventListeners()

      this.logMessage('MQTT 客户端初始化完成', { clientId: this.clientId })
    } catch (error: any) {
      this.handleError('MQTT 连接初始化失败', error)
      throw error
    }
  }

  /**
   * 设置 MQTT 客户端事件监听器
   * @private
   */
  setupEventListeners() {
    const client = this.client

    // 连接成功事件
    client.on('connect', () => {
      this.connectionTime = new Date()
      this._isConnected = true
      this.logMessage('MQTT 连接成功', { clientId: this.clientId })

      // 连接成功后执行自动订阅
      this._executeAutoSubscribe()
    })

    // 重新连接事件
    client.on('reconnect', () => {
      this._isConnected = false
      this.logMessage('MQTT 重新连接开始')
    })

    // 连接关闭事件
    client.on('close', () => {
      this.connectionTime = null
      this._isConnected = false
      this.logMessage('MQTT 连接断开（close 事件）')
    })

    // 离线事件（连接丢失）
    client.on('offline', () => {
      this.connectionTime = null
      this._isConnected = false
      this.logMessage('MQTT 离线（offline 事件）')
      // 提示用户连接已断开
      if (this.isDebug) {
        antMessage.warning('MQTT 连接已断开，将自动重新连接')
      }
    })

    // 错误事件
    client.on('error', (error) => {
      this.messageStats.errors++
      this.handleError('MQTT 客户端错误', error)
      this.logMessage('MQTT 错误详情', {
        message: error.message,
        code: error.code,
        name: error.name,
      })
    })

    // 消息接收事件
    client.on('message', (topic, message) => {
      this.messageStats.received++
      this.handleIncomingMessage(topic, message)
    })

    // 发包事件（调试用）
    client.on('packetsend', (packet) => {
      if (packet && packet.cmd) {
        this.logMessage('发送 MQTT 包', {
          cmd: packet.cmd,
          mid: packet.mid,
        })
      }
    })

    // 收包事件（调试用）
    client.on('packetreceive', (packet) => {
      if (packet && packet.cmd) {
        this.logMessage('收到 MQTT 包', {
          cmd: packet.cmd,
          mid: packet.mid,
        })
      }
    })
  }

  /**
   * 处理接收到的 MQTT 消息
   * @param {string} topic - 消息主题
   * @param {Buffer} message - 消息内容
   * @private
   */
  handleIncomingMessage(topic, message) {
    try {
      // 验证消息有效性
      if (!validateMessage(message)) {
        antMessage.error(`${topic}: 收到空数据消息`)
        return
      }

      // 解析消息内容
      const parsedMessage = parseMessage(message)
      parsedMessage.topic = topic

      // 记录接收到的消息
      this.logMessage('收到 MQTT 消息', {
        topic,
        messageId: parsedMessage.id || 'unknown',
        generalFunc: parsedMessage.generalFunc,
      })

      // 调用策略处理函数
      mqttFun(parsedMessage.generalFunc, parsedMessage)
    } catch (error: any) {
      this.handleError(`${topic}: 消息处理失败`, error)
    }
  }

  /**
   * 发布消息到指定主题
   * @param {Object} message - 要发布的消息对象
   * @param {Function} [callback] - 发布完成后的回调函数
   * @param {number} [qos=1] - QoS 级别（0=最多一次，1=至少一次，2=恰好一次）
   * @returns {Mqtt} 当前实例（支持链式调用）
   */
  async publish(message, callback?: any, qos = 1) {
    // 检查连接状态
    if (!this.client) {
      const errorMsg = '无法发布消息：MQTT 客户端未初始化'
      if (callback) callback(new Error(errorMsg))
      return this
    }

    // 连接尚未建立时等待连接（组件挂载可能早于 CONNACK，直接丢弃会导致请求丢失）
    if (!this.isConnected()) {
      this.logMessage('MQTT 未连接，等待连接后发布', { code: message.code })
      const connected = await this.waitForConnection()
      if (!connected) {
        const errorMsg = '无法发布消息：等待 MQTT 连接超时'
        this.handleError(errorMsg, new Error(errorMsg))
        if (callback) callback(new Error(errorMsg))
        return this
      }
    }

    const mineDesc = getMineDesc()
    const topic = `/${mineDesc}${PUBLISH}/${this.clientId}`

    this.messageStats.sent++

    this.logMessage('发布 MQTT 消息', {
      topic,
      messageId: message.id || 'unknown',
      code: message.code,
      qos: qos,
    })

    // 使用 QoS 1 确保消息可靠性
    this.client.publish(topic, JSON.stringify(message), { qos: qos }, (err) => {
      if (err) {
        this.messageStats.errors++
        this.handleError('消息发布失败', err)
      } else {
        this.logMessage('消息发布成功', {
          topic,
          messageId: message.id,
        })
      }
      if (callback) callback(err)
    })
    return this
  }

  /**
   * 等待 MQTT 连接建立
   * @param {number} [timeout=15000] - 超时时间（毫秒）
   * @returns {Promise<boolean>} 连接是否成功建立
   */
  waitForConnection(timeout = 15000) {
    if (this.isConnected()) return Promise.resolve(true)
    if (!this.client) return Promise.resolve(false)
    return new Promise((resolve) => {
      const client = this.client
      const timer = setTimeout(() => {
        client.off('connect', onConnect)
        resolve(false)
      }, timeout)
      const onConnect = () => {
        clearTimeout(timer)
        client.off('connect', onConnect)
        resolve(true)
      }
      client.on('connect', onConnect)
    })
  }

  /**
   * 执行自动订阅（在连接成功后调用）
   * @private
   */
  _executeAutoSubscribe() {
    if (this.autoSubscribedTopics.length === 0) return

    this.autoSubscribedTopics.forEach((topic) => {
      this.logMessage('执行延迟订阅', { topic })
      this.client.subscribe(topic, (err) => {
        if (err) {
          this.handleError(`启动订阅失败: ${topic}`, err)
        } else {
          this.logMessage('启动订阅成功', { topic })
        }
      })
    })
  }

  /**
   * 订阅通用主题（使用通配符）
   * 订阅格式：/{mineDesc}/Data/{clientId}/#
   * 如果连接未建立则等待连接后再订阅
   */
  subscribeCommon() {
    const mineDesc = getMineDesc()
    const topic = `/${mineDesc}${SUBSCRIBE}/${this.clientId}/#`

    this.logMessage('订阅通用主题', { topic })

    // 检查是否已连接
    if (this._isConnected && this.client && this.client.connected) {
      // 已连接，直接订阅
      this.client.subscribe(topic, (err) => {
        if (err) {
          this.handleError('主题订阅失败', err)
        } else {
          this.logMessage('主题订阅成功', { topic })
        }
      })
    } else {
      // 未连接，添加到自动订阅列表，等待连接后再订阅
      if (!this.autoSubscribedTopics.includes(topic)) {
        this.autoSubscribedTopics.push(topic)
        this.logMessage('订阅已添加到等待队列', { topic, willSubscribeAfterConnect: true })
      }
    }
  }

  /**
   * 订阅特定主题
   * @param {string|string[]} topic - 要订阅的主题或主题数组
   * @param {Object} [options] - 订阅选项
   * @param {Function} [callback] - 订阅完成后的回调函数
   */
  subscribe(topic, options, callback) {
    // 检查是否已连接
    if (!this._isConnected || !this.client || !this.client.connected) {
      const errorMsg = `无法订阅主题 ${topic}: MQTT 未连接`
      this.handleError(errorMsg, new Error(errorMsg))
      if (callback) callback(new Error(errorMsg))
      return
    }

    this.client.subscribe(topic, options, (err) => {
      if (err) {
        this.handleError(`主题订阅失败: ${topic}`, err)
      } else {
        this.logMessage('成功订阅主题', { topic })
      }

      if (callback) callback(err)
    })
  }

  /**
   * 取消订阅主题
   * @param {string|string[]} topic - 要取消订阅的主题或主题数组
   * @param {Function} [callback] - 取消订阅完成后的回调函数
   */
  unsubscribe(topic, callback) {
    this.client.unsubscribe(topic, (err) => {
      if (err) {
        this.handleError(`取消订阅失败: ${topic}`, err)
      } else {
        this.logMessage('成功取消订阅', { topic })
      }

      if (callback) callback(err)
    })
  }

  /**
   * 断开 MQTT 连接
   * @param {boolean} [force=false] - 是否强制断开
   * @param {Function} [callback] - 断开连接后的回调函数
   */
  disconnect(force = false, callback?: any) {
    this.client.end(force, callback)
    this.logMessage('MQTT 连接已断开')
  }

  /**
   * 检查连接状态
   * @returns {boolean} 是否已连接
   */
  isConnected() {
    return this.client && this.client.connected
  }

  /**
   * 获取 MQTT 连接时长（秒）
   * @returns {number} 连接时长，未连接时返回 0
   */
  getConnectionDuration() {
    if (!this.connectionTime) return 0
    return Math.floor((Date.now() - (this.connectionTime?.getTime?.() ?? Date.now())) / 1000)
  }

  /**
   * 获取 MQTT 状态信息
   * @returns {Object} 包含连接状态、消息统计等信息
   */
  getStatusInfo() {
    const isConnected = this.isConnected()
    const duration = this.getConnectionDuration()

    return {
      isConnected,
      clientId: this.clientId,
      connectionTime: this.connectionTime ? this.connectionTime.toLocaleString() : '未连接',
      connectionDuration: `${duration}秒`,
      messageStats: {
        sent: this.messageStats.sent,
        received: this.messageStats.received,
        errors: this.messageStats.errors,
      },
      total: this.messageStats.sent + this.messageStats.received,
    }
  }

  /**
   * 显示 MQTT 状态弹窗（使用 ant-design-vue Modal）
   * @returns {void}
   */
  showStatusModal() {
    const status = this.getStatusInfo()
    const statusText = status.isConnected ? '已连接 ✓' : '已断开 ✗'
    const statusColor = status.isConnected ? '#52c41a' : '#ff4d4f'

    const content = `
      <div style="padding: 12px 0;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px; text-align: right; font-weight: 500; width: 50%;">连接状态：</td>
            <td style="padding: 8px; color: ${statusColor}; font-weight: bold;">${statusText}</td>
          </tr>
          <tr>
            <td style="padding: 8px; text-align: right; font-weight: 500;">客户端 ID：</td>
            <td style="padding: 8px; word-break: break-all; font-family: monospace; font-size: 12px;">
              ${status.clientId || '未初始化'}
            </td>
          </tr>
          <tr>
            <td style="padding: 8px; text-align: right; font-weight: 500;">连接时间：</td>
            <td style="padding: 8px;">${status.connectionTime}</td>
          </tr>
          <tr>
            <td style="padding: 8px; text-align: right; font-weight: 500;">连接时长：</td>
            <td style="padding: 8px;">${status.connectionDuration}</td>
          </tr>
          <tr style="border-top: 1px solid #f0f0f0;">
            <td style="padding: 8px; text-align: right; font-weight: 500;">发送消息数：</td>
            <td style="padding: 8px; color: #1890ff;"><strong>${status.messageStats.sent}</strong></td>
          </tr>
          <tr>
            <td style="padding: 8px; text-align: right; font-weight: 500;">接收消息数：</td>
            <td style="padding: 8px; color: #1890ff;"><strong>${status.messageStats.received}</strong></td>
          </tr>
          <tr>
            <td style="padding: 8px; text-align: right; font-weight: 500;">错误次数：</td>
            <td style="padding: 8px; color: ${status.messageStats.errors > 0 ? '#ff4d4f' : '#52c41a'};"><strong>${status.messageStats.errors}</strong></td>
          </tr>
          <tr>
            <td style="padding: 8px; text-align: right; font-weight: 500;">消息总数：</td>
            <td style="padding: 8px; color: #722ed1;"><strong>${status.total}</strong></td>
          </tr>
        </table>
      </div>
    `

    Modal.info({
      title: 'MQTT 连接状态',
      content: content,
      okText: '关闭',
      width: 500,
      centered: true,
      maskClosable: true,
    })
  }

  /**
   * 重置消息统计信息
   * @returns {void}
   */
  resetMessageStats() {
    this.messageStats = {
      sent: 0,
      received: 0,
      errors: 0,
    }
    this.logMessage('消息统计已重置')
  }
}

export { Mqtt }
