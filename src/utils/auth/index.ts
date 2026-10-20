import CryptoJS from 'crypto-js';
import cookies from './cookie';

import { ACCESS_NET_TOKEN, ACCESS_TOKEN, TOKEN, MINE_DESC, MINE_NAME } from '../mutationTypes';
// 数据过期时间 5天(5 * 24 * 60 * 60 * 1000)
const EXPIRED = 432000000;
const EXPIRED_DAY = 5;
export function getMineName() {
  return cookies.get(MINE_DESC);
}


export function getMineDesc() {
  const desc = cookies.get(MINE_DESC);
  return desc;
}

/**
 *
 * @returns
 */
export function getToken() {
  const token = cookies.get(TOKEN);
  return token ? token.replace(/"/g, '') : token;
}

/**
 *
 * @param {*} token
 * @returns
 */
export function setToken(token) {
  return cookies.set(TOKEN, token, { expires: EXPIRED_DAY });
}

/**
 *
 * @returns
 */
export function removeToken() {
  return cookies.remove(TOKEN);
}

/**
 * 设置信息平台TOKEN
 * @param token
 * @return {*}
 */
export function setAccess_Token(token) {
  return cookies.set(ACCESS_TOKEN, token, { expires: EXPIRED_DAY });
}

/**
 * 获取信息平台token
 * @return {*}
 */
export function getAccess_Token() {
  const token = cookies.get(ACCESS_TOKEN);
  return token ? token.replace(/"/g, '') : token;
}


/**
 *  返回加密授权密钥
 * @param {string} caller 调用者
 * @returns
 */
export function Getdingtalk(caller) {
  const dt = dateFormat('YYYY-mm-dd', new Date()); // 1、获取当前时间：格式示例：2021-09-03
  const key = CryptoJS.SHA1(caller)
    .toString(); // 2、将调用者进行SHA1加密
  // 3、将加密后的key拼接日期后再次加密得到dingtalk
  return CryptoJS.MD5(key + dt)
    .toString();
}

/**
 * 格式时间
 * @param {string} fmt 格式时间字符串
 * @param {Object} date 时间
 * @returns
 */
function dateFormat(fmt, date) {
  let ret;
  const opt = {
    'Y+': date.getFullYear()
      .toString(), // 年
    'm+': (date.getMonth() + 1).toString(), // 月
    'd+': date.getDate()
      .toString(), // 日
    'H+': date.getHours()
      .toString(), // 时
    'M+': date.getMinutes()
      .toString(), // 分
    'S+': date.getSeconds()
      .toString(), // 秒
    // 有其他格式化字符需求可以继续添加，必须转化成字符串
  };
  for (const k in opt) {
    ret = new RegExp('(' + k + ')').exec(fmt);
    if (ret) {
      fmt = fmt.replace(ret[1], (ret[1].length == 1) ? (opt[k]) : (opt[k].padStart(ret[1].length, '0')));
    }
  }
  return fmt;
}
