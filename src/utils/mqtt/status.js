import { Modal, Button, Space } from 'ant-design-vue'
import { h } from 'vue'

/**
 * MQTT 状态监测模块
 * 提供状态显示、刷新和导出等功能
 */

/**
 * 格式化连接时长
 * @param {number} seconds - 秒数
 * @returns {string} 格式化的时长字符串
 */
export function formatDuration(seconds) {
  if (seconds < 60) {
    return `${seconds}秒`
  }
  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60
  if (minutes < 60) {
    return `${minutes}分${secs}秒`
  }
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours}小时${mins}分${secs}秒`
}

/**
 * 创建状态显示的 HTML 内容
 * @param {Object} status - MQTT 状态信息
 * @returns {string} HTML 字符串
 */
export function createStatusHTML(status) {
  const statusText = status.isConnected ? '已连接 ✓' : '已断开 ✗'
  const statusColor = status.isConnected ? '#52c41a' : '#ff4d4f'

  return `
    <div style="padding: 12px 0;">
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <tr style="background-color: #fafafa;">
          <td style="padding: 10px; text-align: right; font-weight: 600; width: 45%;">连接状态：</td>
          <td style="padding: 10px; color: ${statusColor}; font-weight: bold; font-size: 15px;">${statusText}</td>
        </tr>
        <tr>
          <td style="padding: 10px; text-align: right; font-weight: 600;">客户端 ID：</td>
          <td style="padding: 10px; word-break: break-all; font-family: 'Monaco, Menlo, monospace'; font-size: 12px; color: #666;">
            ${status.clientId || '未初始化'}
          </td>
        </tr>
        <tr style="background-color: #fafafa;">
          <td style="padding: 10px; text-align: right; font-weight: 600;">连接时间：</td>
          <td style="padding: 10px;">${status.connectionTime}</td>
        </tr>
        <tr>
          <td style="padding: 10px; text-align: right; font-weight: 600;">连接时长：</td>
          <td style="padding: 10px;">${status.connectionDuration}</td>
        </tr>
        <tr style="border-top: 2px solid #f0f0f0; background-color: #fafafa;">
          <td style="padding: 10px; text-align: right; font-weight: 600;">发送消息数：</td>
          <td style="padding: 10px; color: #1890ff;"><strong>${status.messageStats.sent}</strong> 条</td>
        </tr>
        <tr>
          <td style="padding: 10px; text-align: right; font-weight: 600;">接收消息数：</td>
          <td style="padding: 10px; color: #1890ff;"><strong>${status.messageStats.received}</strong> 条</td>
        </tr>
        <tr style="background-color: #fafafa;">
          <td style="padding: 10px; text-align: right; font-weight: 600;">错误次数：</td>
          <td style="padding: 10px; color: ${status.messageStats.errors > 0 ? '#ff4d4f' : '#52c41a'};"><strong>${status.messageStats.errors}</strong> 次</td>
        </tr>
        <tr>
          <td style="padding: 10px; text-align: right; font-weight: 600;">消息总数：</td>
          <td style="padding: 10px; color: #722ed1;"><strong>${status.total}</strong> 条</td>
        </tr>
      </table>
    </div>
  `
}

/**
 * 将状态信息导出为 JSON
 * @param {Object} status - MQTT 状态信息
 * @returns {string} JSON 字符串
 */
export function exportStatusAsJSON(status) {
  return JSON.stringify(status, null, 2)
}

/**
 * 显示高级状态监测弹窗
 * @param {Object} status - MQTT 状态信息
 * @param {Function} onRefresh - 刷新回调
 * @returns {void}
 */
export function showAdvancedStatusModal(status, onRefresh) {
  const content = createStatusHTML(status)

  Modal.info({
    title: 'MQTT 连接状态监测',
    content: content,
    width: 520,
    centered: true,
    maskClosable: true,
    footer: [
      h('div', { style: { display: 'flex', justifyContent: 'flex-end', gap: '8px' } }, [
        h(Button, {
          key: 'refresh',
          onClick: () => {
            Modal.destroyAll()
            if (onRefresh) onRefresh()
          }
        }, { default: () => '刷新' }),
        h(Button, {
          key: 'close',
          type: 'primary',
          onClick: () => Modal.destroyAll()
        }, { default: () => '关闭' })
      ])
    ]
  })
}
