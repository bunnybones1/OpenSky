import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin'
import react from '@vitejs/plugin-react'
import { ImageLoader } from 'esbuild-vanilla-image-loader'
import fs from 'fs'
import path from 'path'
import { visualizer } from 'rollup-plugin-visualizer'
import { defineConfig, PluginOption } from 'vite'
import checker from 'vite-plugin-checker'
import eslint from 'vite-plugin-eslint'
import glsl from 'vite-plugin-glsl'
import { VitePWA } from 'vite-plugin-pwa'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import tsconfigPaths from 'vite-tsconfig-paths'

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
  dist = !!process.env.GITCOMMIT ? 'release' : 'local'
}

console.log('Building with dist', dist)

const appConfig = fs
  .readFileSync(new URL(`./config/webapp.${dist}.json`, import.meta.url))
  .toString()

const https = Boolean(process.env.VITE_HTTPS)
export default defineConfig({
  server: {
    host: true,
    port: 3000,
    proxy: {
      '/game': { target: 'http://localhost:3001', changeOrigin: true }
    },
    https: https && {
      cert: path.resolve(__dirname)
    }
  },
  build: {
    outDir: './dist',
    sourcemap: true,
    minify: process.env.NODE_ENV !== 'development'
  },
  define: {
    'process.env': {
      GITCOMMIT: process.env.GITCOMMIT,
      RELEASE_VERSION: process.env.RELEASE_VERSION
    }
  },
  plugins: [
    VitePWA({
      injectRegister: 'auto',
      registerType: 'prompt',
      srcDir: 'src',
      filename: 'service-worker.ts',
      strategies: 'injectManifest',
      workbox: {
        sourcemap: false
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,webp,ttf}']
      },
      manifest: {
        short_name: 'OpenSky',
        name: 'OpenSky',
        start_url: '/?source=pwa',
        background_color: '#000000',
        theme_color: '#211455',
        display: 'standalone',
        icons: [
          {
            src: '/images/opensky-square.png',
            type: 'image/png',
            sizes: '192x192'
          },
          {
            src: '/images/opensky-square-192x192.png',
            type: 'image/png',
            sizes: '192x192'
          },
          {
            src: '/images/opensky-square-512x512.png',
            type: 'image/png',
            sizes: '512x512'
          },
          {
            src: '/images/opensky-touch-icon.png',
            type: 'image/png',
            sizes: '180x180'
          }
        ]
      }
    }),
    react({
      jsxRuntime: 'automatic',
      jsxImportSource: '@emotion/react',
      babel: {
        plugins: ['@emotion/babel-plugin']
      }
    }),
    tsconfigPaths(),
    vanillaExtractPlugin({
      identifiers: 'debug',
      esbuildOptions: {
        plugins: [ImageLoader()]
      }
    }),
    visualizer({
      template: 'treemap',
      // open: true,
      gzipSize: true,
      filename: 'stats.html'
    }) as PluginOption,
    eslint({
      include: [resolvePath('**/*.ts'), resolvePath('**/*.tsx')],
      failOnWarning: dist === 'release' ? true : false
    }),
    htmlPlugin(),
    glsl(),
    checker({ typescript: true }),
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
  ]
})

function htmlPlugin(): PluginOption {
  return {
    name: 'html-transform',
    transformIndexHtml(html, ctx) {
      const isDevMode = !!ctx.server || dist === 'local'
      if (!isDevMode) {
        return html.replace(/GITCOMMIT/gm, process.env.GITCOMMIT ?? '')
      } else {
        return html.replace('/*APP_CONFIG>>*/ {} /*<<APP_CONFIG*/', appConfig)
      }
    }
  }
}
