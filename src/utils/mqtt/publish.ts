import { mqtt } from '@/utils/mqtt'
import { getMineDesc, getMineName, getToken } from '../auth'
import { isArray } from '../is'
import { useSetting } from "@/hooks/setting/useSetting"

const { setPageLoading } = useSetting()

// 全局参数映射表
const globalParamMap = new Map()

/**
 * MQTT 消息发布管理器
 * 提供统一的 MQTT 消息发布接口和参数管理
 */

/**
 * 构建标准的 MQTT 消息对象
 * @param {number} code - 消息代码
 * @param {Array} strategyParams - 策略参数数组
 * @returns {Object} 完整的 MQTT 消息对象
 * @private
 */
function buildMessageObject(code, strategyParams) {
  const token = getToken()
  const mineDesc = getMineDesc()
  const caller = import.meta.env.VITE_PRODUCT_CODE
  const clientId = mqtt.clientId

  return {
    code,
    token,
    mineDesc,
    caller,
    clientId,
    noLink: false,
    strategyParams,
  }
}

/**
 * 合并全局参数和传入参数
 * @param {Array} [strategyParams=[]] - 传入的策略参数数组
 * @returns {Array} 合并后的策略参数数组
 * @private
 */
function mergeStrategyParams(strategyParams = []) {
  // 创建本地参数映射,包含全局参数(MineName 每次发布时读取,避免模块加载早于 SSO 写入的时序问题)
  const localParamMap = new Map([...globalParamMap])
  localParamMap.set('MineName', getMineName())

  // 添加传入的策略参数（传入参数会覆盖全局参数）
  if (isArray(strategyParams)) {
    strategyParams.forEach(({ name, value }) => {
      localParamMap.set(name, value)
    })
  }

  // 转换回数组格式
  const mergedParams: any[] = []
  localParamMap.forEach((value, key) => {
    mergedParams.push({
      name: key,
      value,
    })
  })

  return mergedParams
}

/**
 * 发布 MQTT 消息的通用函数
 * @param {Object} config - 发布配置对象
 * @param {number} config.code - 消息代码
 * @param {Array} [config.strategyParams=[]] - 策略参数数组
 * @param {boolean} [config.setLoading=false] - 是否设置页面加载状态
 * @param {Function} [config.callback] - 发布完成后的回调函数
 * @throws {Error} 当消息发布失败时抛出错误
 */
export function publishMessage({ code, strategyParams = [], setLoading = false, callback }: any = {}) {
  try {
    // 合并参数
    const mergedParams = mergeStrategyParams(strategyParams)

    // 构建消息对象
    const message: any = buildMessageObject(code, mergedParams)

    // 发布消息
    mqtt.publish(message, callback)

    // 设置加载状态
    if (setLoading) {
      setPageLoading(true)
    }

    console.debug(`[MQTT Publish] 消息发布成功`, {
      code,
      paramsCount: mergedParams.length,
      messageId: message.id || 'unknown',
      message: message
    })
  } catch (error: any) {
    console.error(`[MQTT Publish Error] 消息发布失败`, {
      code,
      error: error.message
    })
    throw error
  }
}

/**
 * 将普通对象转换为策略参数数组
 * @param {Object} params - 参数对象，键值对形式
 * @returns {Array} 策略参数数组
 * @example
 * // 返回: [{ name: 'key1', value: 'value1' }, { name: 'key2', value: 'value2' }]
 * objectToStrategyParams({ key1: 'value1', key2: 'value2' })
 */
export function objectToStrategyParams(params) {
  if (!params || typeof params !== 'object') {
    return []
  }

  return Object.entries(params).map(([key, value]) => ({
    name: key,
    value,
  }))
}

/**
 * 创建基于特定参数的发布函数工厂
 * @param {Object} options - 工厂选项
 * @param {number} options.code - 消息代码
 * @param {boolean} [options.setLoading=false] - 是否设置加载状态
 * @param {string} [options.paramName='MineName'] - 参数名称
 * @returns {Function} 发布函数
 */
export function createParamPublisher({ code, setLoading = false, paramName = 'MineName' }) {
  /**
   * 发布函数
   * @param {any} paramValue - 参数值
   * @param {Function} [callback] - 发布完成后的回调函数
   */
  return function publishWithParam(paramValue, callback?) {
    publishMessage({
      code,
      strategyParams: [
        {
          name: paramName,
          value: paramValue,
        },
      ],
      setLoading,
      callback,
    })
  }
}

/**
 * 创建基于矿名的发布函数（快捷方式）
 * @param {number} code - 消息代码
 * @param {boolean} [setLoading=false] - 是否设置加载状态
 * @returns {Function} 发布函数
 */
export function createMineNamePublisher(code, setLoading = false) {
  return createParamPublisher({
    code,
    setLoading,
    paramName: 'MineName',
  })
}

// ==================== 具体的发布函数 ====================

/**
 * 发布集团矿井层级信息
 * @param {Object} parameter - 参数对象
 * @param {Function} [callback] - 发布完成后的回调函数
 */
export function groupCompanyLevelMine(parameter?, callback?) {
  publishMessage({
    code: 4694,
    strategyParams: objectToStrategyParams(parameter),
    setLoading: true,
    callback,
  })
}

/**
 * 发布通用项目统计信息
 * @param {Array|Object} strategyParams - 策略参数数组，或普通参数对象（自动转换并过滤空值）
 * @param {Function} [callback] - 发布完成后的回调函数
 */
export function commonItemsStat(strategyParams, callback?) {
  const params = isArray(strategyParams)
    ? strategyParams
    : objectToStrategyParams(strategyParams).filter(
        ({ value }) => value !== '' && value !== null && value !== undefined,
      )

  publishMessage({
    code: 5062,
    strategyParams: params,
    callback,
  })
}

// ==================== 基于矿名的发布函数 ====================

/**
 * 获取集团公司上下文菜单项
 * @type {Function}
 */
export const getGroupCompanyContextmenuItems = createMineNamePublisher(7594)

/**
 * 获取隧道线字符串数据
 * @type {Function}
 */
export const getTunnelLineString = createMineNamePublisher(8138)

/**
 * 获取设备点数据
 * @type {Function}
 */
export const getDevicePoint = createMineNamePublisher(8147)

/**
 * 获取地面孔洞数据
 * @type {Function}
 */
export const getGroundHole = createMineNamePublisher(8154)

/**
 * 获取水域数据
 * @type {Function}
 */
export const getWaterArea = createMineNamePublisher(8175)

/**
 * 获取遍历边界数据
 * @type {Function}
 */
export const getTraverseBoundary = createMineNamePublisher(8184)

/**
 * 添加全局参数
 * @param {string} name - 参数名称
 * @param {any} value - 参数值
 */
export function addGlobalParam(name, value) {
  globalParamMap.set(name, value)
}

/**
 * 移除全局参数
 * @param {string} name - 参数名称
 * @returns {boolean} 是否成功移除
 */
export function removeGlobalParam(name) {
  return globalParamMap.delete(name)
}

/**
 * 获取所有全局参数
 * @returns {Map} 全局参数映射表
 */
export function getGlobalParams() {
  return new Map(globalParamMap)
}

/**
 * 清空所有全局参数
 */
export function clearGlobalParams() {
  globalParamMap.clear()
  // 重新添加默认的矿名参数
  globalParamMap.set('MineName', getMineName())
}
