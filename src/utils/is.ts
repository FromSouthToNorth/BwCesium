// 通用类型判断工具(仅保留项目实际使用的判断)

// TODO 此处 isObject 存在歧义
export function isObject(val) {
  return val !== null && Object.prototype.toString.call(val) === '[object Object]'
}

// TODO 此处 isArray 存在歧义
export function isArray(val) {
  return val && Array.isArray(val)
}

export function isAlphabetic(str) {
  return /^([A-Za-z]+)?$/.test(str);
}

export function isChinese(str) {
  return /[\u4e00-\u9fff]/.test(str)
}
