import { getToken, setToken } from '@/utils/auth';
import { bwSSOSDKLogin } from '@/utils/auth/sso';

/** 需要从 URL 剥离并写入 cookie 的 token 参数名 */
const TOKEN_QUERY_KEYS = ['X-Access-Token', 'x-Access-Token', 'token'];

/** 两次 SSO 重登跳转的最小间隔,防止会话异常时陷入跳转循环 */
const SSO_REDIRECT_INTERVAL = 10_000;

export function createPermissionGuard(router) {
  router.beforeEach((to) => {
    // 1. URL 携带 token(SSO 回跳等场景):写入 cookie 后剥参重进,避免 token 留在地址栏
    const queryToken = TOKEN_QUERY_KEYS.map((key) => to.query[key]).find(Boolean);
    if (typeof queryToken === 'string' && queryToken) {
      setToken(queryToken);
      const query = { ...to.query };
      TOKEN_QUERY_KEYS.forEach((key) => delete query[key]);
      return { path: to.path, query, replace: true };
    }

    // 2. 已有 token cookie,放行
    if (getToken()) return true;

    // 3. mine_key 嵌入模式:页面自身不走 SSO,放行(接口鉴权错误由 axios 层统一提示)
    if (new URLSearchParams(window.location.search).has('mine_key')) return true;

    // 4. 登录态丢失:触发 SSO 重新登录(整页跳转,回来后重新 bootstrap)。
    //    用 sessionStorage 限频,防止会话异常时陷入"重定向→无 token→再重定向"的死循环
    const last = Number(sessionStorage.getItem('bw_sso_redirect_at') || 0);
    if (Date.now() - last > SSO_REDIRECT_INTERVAL) {
      sessionStorage.setItem('bw_sso_redirect_at', String(Date.now()));
      bwSSOSDKLogin(() => window.location.reload());
      return false;
    }

    // 10 秒内已尝试过重登:放行一次,避免阻塞导航(接口层会给出 401 提示)
    return true;
  });
}
