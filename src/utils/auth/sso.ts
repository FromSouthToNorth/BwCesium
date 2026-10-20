declare const BW_SSO_SDK: any

/**
 * SSO 登录失败时的可见降级页(此时应用尚未挂载,不能用组件库)
 */
function showLoginFallback(message: string) {
  console.error(message)
  if (document.getElementById('bw-sso-fallback')) return
  const el = document.createElement('div')
  el.id = 'bw-sso-fallback'
  el.style.cssText =
    'position:fixed;inset:0;z-index:99999;display:flex;flex-direction:column;gap:16px;align-items:center;justify-content:center;background:#f5f5f5;color:rgba(0,0,0,.65);font-size:14px;'
  const text = document.createElement('div')
  text.textContent = `${message},请重试;若多次失败请联系管理员`
  const btn = document.createElement('button')
  btn.textContent = '重试'
  btn.style.cssText = 'padding:5px 24px;cursor:pointer;'
  btn.addEventListener('click', () => window.location.reload())
  el.appendChild(text)
  el.appendChild(btn)
  document.body.appendChild(el)
}

/**
 * 通过统一认证 SDK 完成登录,成功后执行 bootstrap
 * - URL 带 mine_key 的嵌入模式:直接进入应用
 * - 其余场景依赖 index.html 引入的 window.BW_SSO_SDK
 */
export function bwSSOSDKLogin(callback: () => void) {
  const MINE_KEY_PARAM = 'mine_key';
  const urlParams = new URLSearchParams(window.location.search);

  if (urlParams.get(MINE_KEY_PARAM)) {
    callback();
    return;
  }

  // 检查 BW_SSO_SDK 是否存在,缺失时给出可见降级,避免静默白屏
  if (typeof BW_SSO_SDK === 'undefined' || typeof BW_SSO_SDK.SSOLogin !== 'function') {
    showLoginFallback('统一认证 SDK(BW_SSO_SDK)未加载,无法完成登录');
    return;
  }

  BW_SSO_SDK.SSOLogin(window.location.hostname, window.location.port, (data) => {
    if (!data) {
      showLoginFallback('统一认证登录失败(未获取到登录数据)');
      return;
    }
    callback();
  });
}
