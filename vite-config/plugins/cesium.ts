import cesium from 'vite-plugin-cesium'
import type { PluginOption } from 'vite'

export function configCesiumPlugin(): PluginOption {
  return cesium()
}
