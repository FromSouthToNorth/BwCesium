export {
  isArguments,
  isArrayBuffer,
  isArrayLike,
  isArrayLikeObject,
  isBuffer,
  isBoolean,
  isDate,
  isElement,
  isEmpty,
  isEqual,
  isEqualWith,
  isError,
  isFunction,
  isFinite,
  isLength,
  isMap,
  isMatch,
  isMatchWith,
  isNative,
  isNil,
  isNumber,
  isNull,
  isObjectLike,
  isPlainObject,
  isRegExp,
  isSafeInteger,
  isSet,
  isString,
  isSymbol,
  isTypedArray,
  isUndefined,
  isWeakMap,
  isWeakSet,
} from 'lodash-es'
const toString = Object.prototype.toString

export function is(val, type) {
  return toString.call(val) === `[object ${type}]`
}

export function isDef(val) {
  return typeof val !== 'undefined'
}

// TODO 此处 isObject 存在歧义
export function isObject(val) {
  return val !== null && is(val, 'Object')
}

// TODO 此处 isArray 存在歧义
export function isArray(val) {
  return val && Array.isArray(val)
}

export function isWindow(val) {
  return typeof window !== 'undefined' && is(val, 'Window')
}

export const isServer = typeof window === 'undefined'

export const isClient = !isServer

export function isHttpUrl(path) {
  const reg = /^http(s)?:\/\/([\w-]+\.)+[\w-]+(\/[\w- ./?%&=]*)?/
  return reg.test(path)
}

export function isPascalCase(str) {
  const regex = /^[A-Z][A-Za-z]*$/
  return regex.test(str)
}

export function isAlphabetic(str) {
  return /^([A-Za-z]+)?$/.test(str);
}

export function isChinese(str) {
  return /[\u4e00-\u9fff]/.test(str)
}
