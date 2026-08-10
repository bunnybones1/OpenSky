import path from 'path'
import fs from 'fs'
import eslint from 'vite-plugin-eslint'
import glsl from 'vite-plugin-glsl'
import tsconfigPaths from 'vite-tsconfig-paths'
import { visualizer } from 'rollup-plugin-visualizer'
import wasm from 'vite-plugin-wasm'
import topLevelAwait from 'vite-plugin-top-level-await'
import checker from 'vite-plugin-checker'
import react from '@vitejs/plugin-react'
import { viteStaticCopy } from 'vite-plugin-static-copy'

import { defineConfig, Plugin } from 'vite'

const resolvePath = (str: string) => path.resolve(__dirname, str)
const getReleaseVersion = () => {
  for (const value of [process.env.RELEASE_VERSION, process.env.GITCOMMIT]) {
    if (value && value !== 'undefined' && value !== 'null') {
      return value
    }
  }
  return 'dev'
}

const releaseVersion = getReleaseVersion()

let dist = process.env.DIST
if (!dist || dist === '') {
  dist = 'local'
}

console.log('Building with dist', dist)
const appConfig = fs
  .readFileSync(new URL(`./config/game.${dist}.json`, import.meta.url))
  .toString()

export default defineConfig({
  server: {
    port: 3001
  },
  base:
    dist === 'local' || dist === 'compose'
      ? `/game/`
      : `/game/${releaseVersion}/`,
  build: {
    outDir: './dist/game',
    sourcemap: true,
    rollupOptions: {
      onwarn: warning => {
        // we expect the wasm to be double-emitted because of the worker; that's OK!
        if (
          warning.message.includes(
            'overwrites a previously emitted file of the same name.'
          ) &&
          warning.message.includes('.wasm') &&
          warning.message.includes('bindings_bg')
        ) {
          return
        }
        // this is a bug with ethers js & their top-level await transpilation for esm.
        // ethers 5 is prolly never gonna fix this.
        if (
          warning.code === 'THIS_IS_UNDEFINED' &&
          warning.id?.includes('@ethersproject')
        ) {
          return
        }
        if (warning.plugin === 'vite-plugin-eslint' && dist !== 'release') {
          return
        }
        if (dist !== 'release') {
          return
        }
        throw new Error(`${JSON.stringify(warning)}`)
      }
    }
  },
  esbuild: {
    keepNames: true
  },
  define: {
    'process.env': {
      GITCOMMIT: process.env.GITCOMMIT,
      RELEASE_VERSION: process.env.RELEASE_VERSION
    }
  },
  plugins: [
    react(),
    tsconfigPaths(),
    eslint({
      include: [resolvePath('**/*.ts'), resolvePath('**/*.tsx')],
      failOnWarning: dist === 'release'
    }),
    htmlPlugin(),
    glsl(),
    wasm(),
    topLevelAwait(),
    checker({ typescript: true }),
    visualizer({ gzipSize: true }) as Plugin,
    viteStaticCopy({
      targets: [
        {
          src: '../*/locales/*',
          dest: `./locales/${releaseVersion}/`
        },
        {
          src: '../lib/*/locales/*',
          dest: `./locales/${releaseVersion}/`
        }
      ]
    })
  ],
  worker: {
    format: 'es',
    plugins: [tsconfigPaths(), wasm(), topLevelAwait()]
  }
})

function htmlPlugin(): Plugin {
  return {
    name: 'html-transform',
    transformIndexHtml(html, ctx) {
      const isDevMode = !!ctx.server || dist === 'local'
      if (!isDevMode) {
        return html.replace(/GITCOMMIT/gm, process.env.GITCOMMIT ?? '')
      }
      return html.replace('/*APP_CONFIG>>*/ {} /*<<APP_CONFIG*/', appConfig)
    }
  }
}
