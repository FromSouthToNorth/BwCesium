import {
  GROUP_COMPANY_LEVEL_MINE,
  COMMON_ITEMS_STAT,
  DEFAULT_TYPE,
  PROMPT_MESSAGE,
  GROUP_COMPANY_CONTEXTMENU_ITEMS,
  TUNNEL_LINE_STRING,
  DEVICE_POINT,
  GROUND_HOLE,
  WATER_AREA,
  TRAVERSE_BOUNDARY,
  getTypeCategory,
  isValidMessageType,
  getTypeDescriptions,
} from './types'
import { stringEndNumber } from '@/utils/stringEndNumber'
import { useGroupCompanyLevelMine } from '@/components/GroupAndCompany/src/hooks/useGroupCompanyLevelMine'
import { offsetMinePoint } from '@/utils/rbush'
import { notification, Modal, message, Button } from 'ant-design-vue'
import { h } from 'vue'

import { useSetting } from "@/hooks/setting/useSetting"
import { messageStateCode } from './settings'
import { isChinese } from '../is'
import { verifyResponseData, extractStrategyId } from './common'

const { setPageLoading } = useSetting()

const {
  setCommonItemsStat,
  setGroupCompanyLevelMine,
  setContextmenuItems,
  setTunnelGeoJSON,
  setDevicePointGeoJSON,
  setGroundHoleGeoJSON,
  setWaterAreaGeoJSON,
  setTraverseBoundaryGeoJSON
} = useGroupCompanyLevelMine()

/**
 * MQTT 策略处理器映射表
 * 将消息类型映射到对应的处理函数
 * @type {Map<string, Function>}
 */
export const mqttStrategyMap = new Map()

/**
 * 策略处理器基类（可选，用于类型提示）
 */
class StrategyHandler {
  /**
   * 处理消息
   * @param {Object} result - 消息结果
   * @param {Object} result.params - 消息参数
   * @param {string} result.topic - 消息主题
   */
  handle(result) {
    throw new Error('子类必须实现 handle 方法')
  }
}

// ==================== 具体策略处理器 ====================

/**
 * 遍历边界数据处理策略
 * @param {Object} result - 消息结果
 */
function handleTraverseBoundary(result) {
  if (!verifyResponseData(result)) return
  setTraverseBoundaryGeoJSON(result.params)
}

/**
 * 水域数据处理策略
 * @param {Object} result - 消息结果
 */
function handleWaterArea(result) {
  if (!verifyResponseData(result)) return
  setWaterAreaGeoJSON(result.params)
}

/**
 * 地面孔洞数据处理策略
 * @param {Object} result - 消息结果
 */
function handleGroundHole(result) {
  if (!verifyResponseData(result)) return
  setGroundHoleGeoJSON(result.params)
}

/**
 * 设备点数据处理策略
 * @param {Object} result - 消息结果
 */
function handleDevicePoint(result) {
  if (!verifyResponseData(result)) return
  setDevicePointGeoJSON(result.params)
}

/**
 * 隧道线字符串数据处理策略
 * @param {Object} result - 消息结果
 */
function handleTunnelLineString(result) {
  if (!verifyResponseData(result)) return
  setTunnelGeoJSON(result.params)
}

/**
 * 集团公司上下文菜单项处理策略
 * @param {Object} result - 消息结果
 */
function handleGroupCompanyContextmenuItems(result) {
  if (!verifyResponseData(result)) return
  console.debug('收到上下文菜单项数据:', result.params)
  setContextmenuItems(result.params)
}

/**
 * 集团矿井层级信息处理策略
 * @param {Object} result - 消息结果
 */
function handleGroupCompanyLevelMine(result) {
  if (!verifyResponseData(result)) return

  const { params } = result

  // 处理数据：为每条数据添加唯一 ID
  const processedData = params.data.map(item => ({
    ...item,
    id: `${item.MineDesc}${item.name}`
  }))

  // 偏移矿井点（避免重叠）
  params.data = offsetMinePoint([...processedData])

  // 注释掉的列生成逻辑（保留供参考）
  // const columns = []
  // const keys = Object.keys(processedData[0])
  // keys.forEach((key) => {
  //   if (!isChinese(key)) return
  //   columns.push({
  //     title: key,
  //     dataIndex: key,
  //   })
  // })
  // params.columns = columns

  setGroupCompanyLevelMine(params)
}

/**
 * 通用项目统计处理策略
 * @param {Object} result - 消息结果
 */
function handleCommonItemsStat(result) {
  if (!verifyResponseData(result)) return
  setCommonItemsStat(result.params)
}

/**
 * 提示消息处理策略
 * @param {Object} result - 消息结果
 */
function handlePromptMessage(result) {
  const { params } = result
  const { mesg, mesgInfo } = params

  console.debug('收到提示消息:', params)

  // 关闭页面加载状态
  setPageLoading(false)

  // 如果没有消息信息，显示错误通知
  if (!mesgInfo) {
    notification.error({
      description: mesg,
      duration: 6,
    } as any)
    return
  }

  let { bwurl, level } = mesgInfo

  // 计算消息级别（0-3，对应 info/success/warning/error）
  level = mesgInfo ? (level - 11 > 3 ? 3 : level - 11) : 3

  // 显示消息提示
  const messageType = messageStateCode[level]?.type || 'error'
  message[messageType](mesg, 6)

  // 如果没有链接，直接返回
  if (!bwurl) return

  // 解析链接信息
  let urlInfo
  try {
    urlInfo = JSON.parse(bwurl)
  } catch (error: any) {
    console.error('链接信息解析失败:', error)
    return
  }

  const { url } = urlInfo

  // 显示带链接的通知
  notification[messageType]({
    description: mesg,
    duration: null, // 不自动关闭
    btn: () => h(Button, {
      type: 'primary',
      size: 'small',
      onClick: () => {
        handleMessageLink(url, messageType)
      },
    }, () => '查看链接'),
  })
}

/**
 * 处理消息中的链接
 * @param {string|Array} url - 链接信息
 * @param {string} messageType - 消息类型
 * @private
 */
function handleMessageLink(url, messageType) {
  const origin = window.location.origin

  if (Array.isArray(url)) {
    const [action, path] = url

    switch (action) {
      case 'popup':
        // 弹出模态框
        Modal[messageType]({
          content: h('iframe', {
            src: origin + path,
            style: { width: '100%', height: '400px', border: 'none' }
          }),
          className: 'popup-modal',
          width: 800,
          maskClosable: true,
          destroyOnClose: true,
        })
        break

      case 'newwindow':
        // 新窗口打开
        window.open(origin + path, '_blank')
        break

      default:
        console.warn('未知的链接动作:', action)
        window.open(origin + path, '_blank')
    }
  } else {
    // 直接打开链接
    window.open(origin + url, '_blank')
  }
}

// ==================== 策略注册 ====================

/**
 * 注册策略处理器
 * @param {string} type - 消息类型
 * @param {Function} handler - 处理函数
 */
export function registerStrategy(type, handler) {
  if (!isValidMessageType(type)) {
    console.warn(`尝试注册无效的消息类型: ${type}`)
    return
  }

  mqttStrategyMap.set(type, handler)
  console.debug(`策略注册成功: ${type} -> ${handler.name}`)
}

/**
 * 批量注册策略处理器
 * @param {Array<[string, Function]>} strategies - 策略数组，每个元素为 [类型, 处理函数]
 */
export function registerStrategies(strategies) {
  strategies.forEach(([type, handler]) => {
    registerStrategy(type, handler)
  })
}

// 注册所有内置策略
registerStrategies([
  [GROUP_COMPANY_LEVEL_MINE, handleGroupCompanyLevelMine],
  [COMMON_ITEMS_STAT, handleCommonItemsStat],
  [PROMPT_MESSAGE, handlePromptMessage],
  [DEFAULT_TYPE, handlePromptMessage], // 默认类型也使用提示消息处理器
  [GROUP_COMPANY_CONTEXTMENU_ITEMS, handleGroupCompanyContextmenuItems],
  [TUNNEL_LINE_STRING, handleTunnelLineString],
  [DEVICE_POINT, handleDevicePoint],
  [GROUND_HOLE, handleGroundHole],
  [WATER_AREA, handleWaterArea],
  [TRAVERSE_BOUNDARY, handleTraverseBoundary],
])

/**
 * MQTT 消息处理主函数
 * 根据消息类型调用对应的策略处理器
 * @param {string} type - 消息类型
 * @param {Object} result - 消息结果
 * @returns {boolean} 是否成功处理
 */
export function processMqttMessage(type, result) {
  // 验证消息类型
  if (!isValidMessageType(type)) {
    console.error(`无效的消息类型: ${type}`, {
      validTypes: getTypeDescriptions(),
      topic: result.topic,
    })
    return false
  }

  // 获取处理器
  const handler = mqttStrategyMap.get(type)

  if (!handler) {
    const strategyId = extractStrategyId(result.topic)
    console.error(`未找到消息类型对应的处理器: ${type}`, {
      strategyId,
      category: getTypeCategory(type),
      topic: result.topic,
    })
    return false
  }

  try {
    // 执行处理
    console.debug(`处理 MQTT 消息: ${type}`, {
      category: getTypeCategory(type),
      topic: result.topic,
      hasParams: !!result.params,
    })

    handler(result)
    return true
  } catch (error: any) {
    console.error(`消息处理失败: ${type}`, {
      error: error.message,
      stack: error.stack,
      topic: result.topic,
    })
    return false
  }
}

/**
 * 获取已注册的策略数量
 * @returns {number} 策略数量
 */
export function getRegisteredStrategyCount() {
  return mqttStrategyMap.size
}

/**
 * 获取所有已注册的策略类型
 * @returns {string[]} 策略类型数组
 */
export function getRegisteredStrategyTypes() {
  return Array.from(mqttStrategyMap.keys())
}

/**
 * 检查策略是否已注册
 * @param {string} type - 消息类型
 * @returns {boolean} 是否已注册
 */
export function isStrategyRegistered(type) {
  return mqttStrategyMap.has(type)
}

// 向后兼容的别名
export const mqttFun = processMqttMessage
export const mqttFunMap = mqttStrategyMap
