/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 部署基础路径,如 /BwCesium/ */
  readonly VITE_PUBLIC_PATH: string
  /** 产品标识,如 BwCesium */
  readonly VITE_PRODUCT_CODE: string
  /** 是否启用 mock */
  readonly VITE_USE_MOCK: string
  /** 接口代理前缀 */
  readonly VITE_GLOB_API_URL: string
  /** 上传接口前缀 */
  readonly VITE_GLOB_UPLOAD_URL: string
  /** 接口基础路径 */
  readonly VITE_GLOB_API_BASE_URL: string
  readonly VITE_GLOB_API_URL_PREFIX: string
  /** 地图瓦片地址 */
  readonly VITE_GLOB_MAP_URL: string
  readonly VITE_GLOB_FILEAPI_SITE: string
  readonly VITE_GLOB_FILEAPI_COMPANY: string
  readonly VITE_BUILD_COMPRESS: string
  readonly VITE_GLOB_APP_TITLE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
