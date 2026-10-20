import { notification } from 'ant-design-vue';
import axios from 'axios';

import { getToken } from '../auth';

const caller = 'BwGISOneMap';
axios.defaults.headers['content-type'] = 'application/json;charset=utf-8';
axios.defaults.headers['caller'] = caller;

// 创建 axios 实例
const service = axios.create({
  // axios 中请求配置有 baseURL 选择，表示请求 URL 公共部分
  baseURL: import.meta.env.VITE_GLOB_API_URL,
  // 超时
  timeout: 90000,
});

const err = (error) => {
  if (error.response) {
    const data = error.response.data;
    console.log(error.response.data.mesg);
    const token = getToken();
    console.log('------异常响应------', token);
    console.log('------异常响应------', error.response.status);
    switch (error.status) {
      case 403:
        notification.error({ message: '系统提示', description: '拒绝访问', duration: 4 });
        break;
      case 500:
        console.log('------error.response------', error.response);
        const type = error.response.request.responseType;
        console.log('----type----', type);
        break;
      case 404:
        notification.error({ message: '系统提示', description: '很抱歉，资源未找到!', duration: 4 });
        break;
      case 504:
        notification.error({ message: '系统提示', description: '网络超时' });
        break;
      case 401:
        notification.error({ message: '系统提示', description: '未授权，请重新登录', duration: 4 });
        break;
      default:
        notification.error({
          message: '系统提示',
          description: data.message,
          duration: 4,
        });
        break;
    }
  }
  return Promise.reject(error);
};

// request 拦截器
service.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers['token'] = token; // 让每个请求携带自定义 token 请根据实际情况自行修改
  }
  // else {
  //   // config.headers['dingtalk'] = Getdingtalk(caller)
  // }
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

