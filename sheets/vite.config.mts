import dsv from '@rollup/plugin-dsv'
import react from '@vitejs/plugin-react'
import path from 'path'
import { defineConfig, PluginOption } from 'vite'
import checker from 'vite-plugin-checker'
import eslint from 'vite-plugin-eslint'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import tsconfigPaths from 'vite-tsconfig-paths'

import { dataFolderPath } from '../design-data/scripts/dataLocations'
import { filesystemToJSON } from '../design-data/scripts/fs-to-json'
const resolvePath = (str: string) => path.resolve(__dirname, str)

export default defineConfig({
  server: {
    host: true,
    port: 1997,
    proxy: {
      '/assets': {
        target: 'http://localhost:4001/',
        rewrite: (path) => path.replace(/^\/assets/, '')
      }
    }
  },
  base: process.env.GITCOMMIT ? `/sheets/${process.env.GITCOMMIT}/` : undefined,
  build: {
    outDir: './dist/sheets',
    sourcemap: true,
    minify: false
  },
  plugins: [
    react({
      jsxRuntime: 'automatic'
    }),
    tsconfigPaths(),
    dsv() as any,
    checker({ typescript: true }),
    viteStaticCopy({
      targets: [
        {
          src: '../*/locales/*',
          dest: `./locales/${process.env.GITCOMMIT ?? 'dev'}/`
        },
        {
          src: '../lib/*/locales/*',
          dest: `./locales/${process.env.GITCOMMIT ?? 'dev'}/`
        }
      ]
    }),
    await staticEmbedDesignData(),
    ...(process.env.SKIP_LINT
      ? []
      : [
          eslint({
            include: [resolvePath('**/*.ts'), resolvePath('**/*.tsx')],
            failOnWarning: true
          })
        ])
  ]
})

async function staticEmbedDesignData(): Promise<PluginOption> {
  const allDesignData = await filesystemToJSON(dataFolderPath)
  return {
    name: 'html-transform',
    transformIndexHtml(html, ctx) {
      const isDevMode = !!ctx.server
      if (!isDevMode) {
        return html.replace(
          'window.STATIC_DESIGN_DATA = undefined',
          `window.STATIC_DESIGN_DATA = ${JSON.stringify(allDesignData)}`
        )
      } else {
        return html
      }
    }
  }
}
