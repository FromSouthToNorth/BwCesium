/**
 * Plugin to minimize and use ejs template syntax in index.html.
 * https://github.com/anncwb/vite-plugin-html
 */
import { createHtmlPlugin } from 'vite-plugin-html'

export function configHtmlPlugin({ isBuild }) {
  const htmlPlugin = createHtmlPlugin({
    minify: isBuild,
  })
  return htmlPlugin
}
