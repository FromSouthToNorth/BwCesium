import svgLoader from 'vite-svg-loader'
import type { PluginOption } from 'vite'

export function configSvgPlugin(): PluginOption {
  return svgLoader()
}
