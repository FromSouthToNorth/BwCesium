/**
 * 矿井右键菜单操作函数集合
 * 菜单项通过 operation 字段名索引到此表,由 setContextmenuItems 挂载
 */
export type MenuOperation = (e: MenuOperationEvent) => void

export interface MenuOperationEvent {
  /** 目标字段名(如 httpurl / vpnurl),其值作为打开的 URL */
  field: string
  /** 窗口类型,如 newWindow */
  type: string
  /** 允许携带任意业务字段 */
  [key: string]: unknown
}

export const fun: Record<string, MenuOperation> = {
  onClick,
}

/**
 * 处理点击事件，根据类型打开窗口
 * @param e - 事件对象
 * @param e.field - 字段名
 * @param e.type - 窗口类型
 */
function onClick(e: MenuOperationEvent) {
  const { field, type } = e
  const url = e[field]
  if (typeof url !== 'string' || !url) {
    console.warn(`字段 ${field} 不存在或为空`)
    return
  }

  switchWindow(type, url)
}

/**
 * 根据类型切换窗口
 * @param type - 窗口类型
 * @param url - 要打开的URL
 */
function switchWindow(type: string, url: string) {
  try {
    switch (type) {
      case 'newWindow':
        window.open(url, '_blank', 'noopener,noreferrer')
        break
      default:
        console.warn(`未知的窗口类型: ${type}`)
    }
  } catch (error: any) {
    console.error('打开窗口时发生错误:', error)
  }
}
