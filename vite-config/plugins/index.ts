import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import type { PluginOption } from 'vite'
import { configHtmlPlugin } from './html'
import { configCesiumPlugin } from './cesium'
import { configSvgPlugin } from './svg'

async function createPlugins({ isBuild, root: _root }: { isBuild: boolean, root?: string }): Promise<PluginOption[]> {
  const vitePlugins: PluginOption[] = [vue(), vueJsx()]

  // vite-plugin-html
  vitePlugins.push(configHtmlPlugin({ isBuild }))
  vitePlugins.push(configCesiumPlugin())
  vitePlugins.push(configSvgPlugin())

  return vitePlugins
}

export { createPlugins }
