/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 部署基础路径,如 /BwCesium/ */
  readonly VITE_PUBLIC_PATH: string
  /** 产品标识,如 BwCesium */
  readonly VITE_PRODUCT_CODE: string
  /** 接口代理前缀 */
  readonly VITE_GLOB_API_URL: string
  /** 应用标题(index.html ejs 使用) */
  readonly VITE_GLOB_APP_TITLE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
