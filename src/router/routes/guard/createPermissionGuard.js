import { getToken, setToken } from '@/utils/auth';

/**
 *
 * @param {*} router
 */
export function createPermissionGuard(router) {
  router.beforeEach(async (to, form, next) => {
    const xs = ['X-Access-Token', 'x-Access-Token'];

    // 去掉路径上 X-Access-Token 参数
    const xAccessToken = to.query[xs[0]] || to.query[xs[1]];
    if (xAccessToken) {
      const map = new Map();
      Object.keys(to.query)
        .forEach((key) => {
          if (!xs.includes(key)) {
            map.set(key, to.query[key]);
          }
        });
      const query = Object.fromEntries(map);
      next({ path: to.path, query: query });
    }
    const { token } = to.query;


    if (token) {
      setToken(token);
      delete to.query.token;
      next(to || '/');
      return;
    }

    const attToken = getToken();
    if (attToken) {
      next();
      return;
    }
  });
}

