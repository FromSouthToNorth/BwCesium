import { resolve } from 'node:path'

import dayjs from 'dayjs'
import { readPackageJSON } from 'pkg-types'
import { defineConfig, mergeConfig } from 'vite'
import type { ConfigEnv, UserConfig } from 'vite'

import { commonConfig } from './common'

import { createPlugins } from './plugins'

interface ApplicationOptions {
  overrides?: UserConfig
}

function defineApplicationConfig(defineOptions: ApplicationOptions = {}) {
  const { overrides = {} } = defineOptions

  return defineConfig(async ({ command, mode }: ConfigEnv) => {
    const root = process.cwd()
    const isBuild = command === 'build'
    const plugins = await createPlugins({ isBuild, root })

    const defineData = await createDefineData(root)

    const pathResolve = (pathname: string) => resolve(root, '.', pathname)
    const timestamp = new Date().getTime()
    const applicationConfig: UserConfig = {
      // base: VITE_PUBLIC_PATH,
      resolve: {
        alias: [
          // @/xxxx => src/xxxx
          {
            find: /@\//,
            replacement: `${pathResolve('src')}/`,
          },
        ],
      },
      define: {
        'process.env': {},
        ...defineData
      },
      build: {
        target: 'es2015',
        cssTarget: 'chrome80',
        rollupOptions: {
          output: {
            // 入口文件名
            entryFileNames: `assets/entry/[name]-[hash]-${timestamp}.js`,
            // vite 8 (rolldown) 不再支持对象形式,改用函数形式分包
            manualChunks(id: string) {
              if (!id.includes('node_modules')) return undefined
              if (/[\\/]node_modules[\\/](vue|@vue|pinia|vue-router)[\\/]/.test(id)) return 'vue'
              if (/[\\/]node_modules[\\/](ant-design-vue|@ant-design)[\\/]/.test(id)) return 'antd'
              return undefined
            },
          },
        },
      },
      css: {
        preprocessorOptions: {
          less: {
            javascriptEnabled: true,
          },
        },
      },
      plugins,
    }

    const mergedConfig = mergeConfig(commonConfig(mode), applicationConfig)

    return mergeConfig(mergedConfig, overrides)
  })
}

async function createDefineData(root: string) {
  try {
    const pkgJson = await readPackageJSON(root)
    const { dependencies, devDependencies, name, version } = pkgJson

    const __APP_INFO__ = {
      pkg: { dependencies, devDependencies, name, version },
      lastBuildTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    }
    return {
      __APP_INFO__: JSON.stringify(__APP_INFO__),
    }
  }
  catch {
    return {}
  }
}

export { defineApplicationConfig }
