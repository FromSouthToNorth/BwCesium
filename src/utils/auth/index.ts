import cookies from './cookie';

import { TOKEN, MINE_DESC } from '../mutationTypes';
// 数据过期时间 5天(5 * 24 * 60 * 60 * 1000)
const EXPIRED_DAY = 5;

export function getMineName() {
  return cookies.get(MINE_DESC);
}

export function getMineDesc() {
  const desc = cookies.get(MINE_DESC);
  return desc;
}

/**
 * 获取登录 token
 */
export function getToken() {
  const token = cookies.get(TOKEN);
  return token ? token.replace(/"/g, '') : token;
}

/**
 * 写入登录 token
 */
export function setToken(token) {
  return cookies.set(TOKEN, token, { expires: EXPIRED_DAY });
}

/**
 * 清除登录 token(401/登出时使用)
 */
export function removeToken() {
  return cookies.remove(TOKEN);
}
