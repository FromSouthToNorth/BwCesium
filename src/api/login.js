import { getToken } from '@/utils/auth';

import { TOKEN } from '@/utils/mutationTypes';

import { axios } from '@/utils/axios/request';

// 登录方法
export function login(username, password) {
  const data = {
    UserName: username,
    Passwd: password,
  };
  return axios({
    url: '/api/OAuth/Login',
    method: 'post',
    data: data,
  });
}

export function getUserInfo() {
  return axios({
    url: '/api/OAuth/Verify',
    method: 'post',
    data: getToken(),
  });
}

// 获取当前用户是否存在标注权限
export function getUserRoleDeviceMark() {
  const data = {
    id: 4016,
  };
  return axios({
    url: '/api/PoininfoSmartValid/GetStrategyData',
    method: 'post',
    data: data,
  });
}

/**
 * 通过头部dingtalk,转换实际token
 * @returns
 */
export function getDingtalkToToken(token) {
  return axios({
    url: '/api/OAuth/ExchangeAccessToken',
    method: 'get',
    headers: {
      'X-Access-Token': token,
    },
  });
}
