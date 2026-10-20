import { defineApplicationConfig } from './vite-config/application'

export default defineApplicationConfig({
  overrides: {
    server: {
      proxy: {
        '/BW3DTileset': {
          target: 'http://192.168.133.57:33394/',
          rewrite: (path: string) => path.replace(/^\/BW3DTileset/, ''),
        },
        '/net': {
          target: 'http://192.168.133.110:33382/',
          changeOrigin: true,
        },
        '/gis': {
          target: 'http://192.168.133.110:33382',
        },
        '/bwmes-boot/': {
          target: 'http://192.168.133.110:33382/',
          changeOrigin: true,
        },
        '/BwMap': {
          target: 'http://192.168.133.110:33382/',
          // rewrite: (path: string) => path.replace(/^\/BwMap/, ''),
        },
        '/bwmes': {
          target: 'http://192.168.133.110:33382/',
        },
        '/Home': {
          target: 'http://192.168.133.110:33382/',
        },
        '/bwportal': {
          target: 'http://192.168.133.110:33382',
        },
        '/bwoffice': {
          target: 'http://192.168.133.110:33382',
        },
        '/BwCesium/mqtt': {
          target: 'ws://192.168.133.110:33382',
          ws: true,
          rewrite: (path: string) => path.replace(/^\/BwCesium\/mqtt/, '/mqtt'),
        },
        '/cas/': {
          target: 'http://192.168.133.110:33382',
          ws: true,
        },
        '/BwDeviceManage': {
          target: 'http://192.168.133.110:33382',
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
