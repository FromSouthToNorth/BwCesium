import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import { configHtmlPlugin } from './html'
import { configCesiumPlugin } from './cesium'
import { configSvgPlugin } from './svg'

async function createPlugins({ isBuild }) {
  const vitePlugins = [vue(), vueJsx()]

  // vite-plugin-html
  vitePlugins.push(configHtmlPlugin({ isBuild }))
  vitePlugins.push(configCesiumPlugin())
  vitePlugins.push(configSvgPlugin())

  return vitePlugins
}

export { createPlugins }
