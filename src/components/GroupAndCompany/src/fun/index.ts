export const fun = {
  onClick,
};

/**
 * 处理点击事件，根据类型打开窗口
 * @param {Object} e - 事件对象
 * @param {string} e.field - 字段名
 * @param {string} e.type - 窗口类型
 */
function onClick(e) {
  const { field, type } = e;
  if (!e[field]) {
    console.warn(`字段 ${field} 不存在或为空`);
    return;
  }

  const url = e[field];
  switchWindow(type, url);
}

/**
 * 根据类型切换窗口
 * @param {string} type - 窗口类型
 * @param {string} url - 要打开的URL
 */
function switchWindow(type, url) {
  try {
    switch (type) {
      case 'newWindow':
        window.open(url, '_blank', 'noopener,noreferrer');
        break;
      default:
        console.warn(`未知的窗口类型: ${type}`);
    }
  } catch (error) {
    console.error('打开窗口时发生错误:', error);
  }
}
