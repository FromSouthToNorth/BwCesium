// 内网服务地址(开发代理统一指向)
const API_TARGET = 'http://192.168.133.110:33382'
const TILE_TARGET = 'http://192.168.133.57:33394'

import { defineApplicationConfig } from './vite-config/application'

export default defineApplicationConfig({
  overrides: {
    server: {
      proxy: {
        '/BW3DTileset': {
          target: TILE_TARGET,
          rewrite: (path: string) => path.replace(/^\/BW3DTileset/, ''),
        },
        '/net': {
          target: API_TARGET,
          changeOrigin: true,
        },
        '/gis': {
          target: API_TARGET,
        },
        '/bwmes-boot/': {
          target: API_TARGET,
          changeOrigin: true,
        },
        '/BwMap': {
          target: API_TARGET,
          // rewrite: (path: string) => path.replace(/^\/BwMap/, ''),
        },
        '/bwmes': {
          target: API_TARGET,
        },
        '/bwmodel': {
          target: API_TARGET,
          changeOrigin: true,
        },
        '/Home': {
          target: API_TARGET,
        },
        '/bwportal': {
          target: API_TARGET,
        },
        '/bwoffice': {
          target: API_TARGET,
        },
        '/BwCesium/mqtt': {
          target: API_TARGET.replace('http', 'ws'),
          ws: true,
          rewrite: (path: string) => path.replace(/^\/BwCesium\/mqtt/, '/mqtt'),
        },
        '/cas/': {
          target: API_TARGET,
          ws: true,
        },
        '/BwDeviceManage': {
          target: API_TARGET,
          ws: true,
        },
      },
      open: true, // 项目启动后，自动打开
      hmr: true,
      warmup: {
        clientFiles: ['./index.html', './src/{views,components}/*'],
      },
    },
  },
})
