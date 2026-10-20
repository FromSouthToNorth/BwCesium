declare const BW_SSO_SDK: any
import { getDingtalkToToken } from '@/api/login';
import { setToken } from '@/utils/auth';

export function initSso(callback) {
  const token = getUrlParam('X-Access-Token');
  if (token) {
    getDingtalkToToken(token).then((res) => {
      setToken(res.data);
      callback();
    });
  } else {
    callback();
  }
}

export function getUrlParam(name) {
  const reg = new RegExp('(^|&)' + name + '=([^&]*)(&|$)', 'i');
  const r = window.location.search.substr(1)
    .match(reg);
  if (r != null) return decodeURIComponent(r[2]);
  return null;
}


export function bwSSOSDKLogin(callback) {
  const MINE_KEY_PARAM = 'mine_key';
  const { hostname, port } = window.location;
  const urlParams = new URLSearchParams(window.location.search);

  if (urlParams.get(MINE_KEY_PARAM)) {
    callback();
    return;
  }

  // 检查BW_SSO_SDK是否存在
  if (typeof BW_SSO_SDK === 'undefined' || typeof BW_SSO_SDK.SSOLogin !== 'function') {
    console.warn('BW_SSO_SDK not available');
    return;
  }

  BW_SSO_SDK.SSOLogin(hostname, port, (data) => {
    if (!data) {
      console.warn('SSO login failed: no data returned');
      return;
    }
    callback();
  });
}
