import { notification } from 'ant-design-vue';
import axios from 'axios';

import { getToken, removeToken } from '../auth';

const caller = 'BwGISOneMap';

// 创建 axios 实例(请求头只挂实例,不污染全局 axios)
const service = axios.create({
  // axios 中请求配置有 baseURL 选择，表示请求 URL 公共部分
  baseURL: import.meta.env.VITE_GLOB_API_URL,
  // 超时
  timeout: 90000,
});

service.defaults.headers['content-type'] = 'application/json;charset=utf-8';
service.defaults.headers['caller'] = caller;

const err = (error) => {
  // 无 response:网络层错误(断网/超时/DNS)
  if (!error.response) {
    notification.error({ message: '系统提示', description: '网络异常,请检查网络连接', duration: 4 });
    return Promise.reject(error);
  }

  const { status, data } = error.response;
  const description = data?.mesg || data?.message || '请求失败';

  switch (status) {
    case 401:
      notification.error({ message: '系统提示', description: '登录状态已失效,请重新登录', duration: 4 });
      // 清除本地登录态后整页刷新,走 SSO 重新登录
      removeToken();
      setTimeout(() => window.location.reload(), 1500);
      break;
    case 403:
      notification.error({ message: '系统提示', description: '拒绝访问', duration: 4 });
      break;
    case 404:
      notification.error({ message: '系统提示', description: '很抱歉,资源未找到!', duration: 4 });
      break;
    case 504:
      notification.error({ message: '系统提示', description: '网络超时', duration: 4 });
      break;
    default:
      notification.error({ message: '系统提示', description, duration: 4 });
      break;
  }
  return Promise.reject(error);
};

// request 拦截器
service.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers['token'] = token;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

service.interceptors.response.use((response) => {
  return response.data;
}, err);

export {
  service as axios,
};
