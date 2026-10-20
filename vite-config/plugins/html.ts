/**
 * Plugin to minimize and use ejs template syntax in index.html.
 * https://github.com/anncwb/vite-plugin-html
 */
import { createHtmlPlugin } from 'vite-plugin-html'
import type { PluginOption } from 'vite'

export function configHtmlPlugin({ isBuild }: { isBuild: boolean }): PluginOption {
  const htmlPlugin = createHtmlPlugin({
    minify: isBuild,
  })
  return htmlPlugin
}
