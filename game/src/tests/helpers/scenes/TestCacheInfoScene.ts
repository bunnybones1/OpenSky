import { AssetName, assetUrls } from '@opensky/shared/assets'
import {
  getCacheStatuses,
  getExhaustiveAndExpensiveCacheStorageInfo
} from '@opensky/shared/cache'
import { CacheNames } from '@opensky/shared/cacheFilters'
import { supportsAssetCacheProxy } from '@opensky/shared/check-asset-cache-proxy-support'
import { formatBytes } from '@opensky/shared/formatBytes'
import { getAssetPaths } from '@opensky/shared/naiveGameAssets'
import { getLocalWebServer } from '@opensky/shared/opensky-webserver/index'
import { delayPromise } from '@opensky/shared/utils/async'
import { lookInCache } from '@opensky/shared/utils/cacheyFetch'
import {
  listenToProperty,
  stopListeningToProperty
} from '@opensky/shared/utils/propertyListeners'
import { throttle2 } from '@opensky/shared/utils/throttlers'

import { getAssetsManager } from '~/assets'
import { ReadonlyPin } from '~/helpers/LayoutHelpers'
import { UI } from '~/scenes/ui'
import * as textOptions from '~/systems/text/TextOptions'
import UITextMesh from '~/systems/text/UITextMesh'
import { makeQuickButtonColumn, QuickButtonData } from '~/utils/quickButton'

import { BaseTestScene } from './BaseTestScene'

class TestCacheInfoScene extends BaseTestScene {
  async initUI(ui: UI) {
    await getAssetsManager().loadAsset('uiSmall')
    await getAssetsManager().loadAsset('particle')

    const container = ui.getContainer('randomTests')
    await container.ready
    const labelTextOptions = {
      ...textOptions.debugText,
      size: 16
    }
    const labelTop = new UITextMesh('...', labelTextOptions)
    labelTop.matrix.setConstraints(
      ReadonlyPin.EmptySize,
      ReadonlyPin.Center,
      ReadonlyPin.Top.cloneOffset(0, 200)
    )
    container.add(labelTop)
    const labelCenter = new UITextMesh('...', labelTextOptions)
    labelCenter.matrix.setConstraints(
      ReadonlyPin.EmptySize,
      ReadonlyPin.Center,
      ReadonlyPin.Center
    )
    container.add(labelCenter)
    const labelBottom = new UITextMesh(
      'Waiting for button interaction...',
      labelTextOptions
    )
    labelBottom.matrix.setConstraints(
      ReadonlyPin.EmptySize,
      ReadonlyPin.Center,
      ReadonlyPin.Bottom.cloneOffset(0, -100)
    )
    container.add(labelBottom)
    const loopy = '-\\|/'
    const working = { value: false }

    const assetBasePaths: string[] = getAssetPaths('current_device')
    // for (const key in getAssetsManager().assetsConfig) {
    //   const assetKey = key as keyof typeof getAssetsManager().assetsConfig
    //   const basePath = await getAssetsManager().getAssetUrl(assetKey)
    //   assetBasePaths.push(basePath)
    //   if (basePath.endsWith('.gtlf')) {
    //     assetBasePaths.push(basePath.replace('.gltf', '.bin'))
    //   }
    // }

    const loadAsset = async (assetName: AssetName) => {
      if (working.value) {
        return
      }
      working.value = true
      const url = await getAssetsManager().getAssetFullUrl(assetName)
      labelTop.text = `request url: ${url}`
      await getAssetsManager().loadAsset(assetName)
      labelBottom.text = 'asset loaded'
      working.value = false
    }
    const isAssetCached = (assetName: AssetName) => {
      if (working.value) {
        return
      }
      working.value = true
      const basePath = assetUrls[assetName]
      const url = getAssetsManager().getAssetFullUrl(assetName)
      labelTop.text = `request url: ${url}\n
        request basePath: ${basePath}`
      if (supportsAssetCacheProxy()) {
        getLocalWebServer()
          .getCachedFileHashes()
          .then(d => {
            working.value = false
            labelBottom.text = `response url: ${url}\n
                    response basePath: ${basePath}\n
                    isCached: ${d.sha256Hashes.includes(url)}`
          })
      } else {
        lookInCache(CacheNames.GAME_RESOURCES, async cache => {
          if (cache) {
            const url = getAssetsManager().getAssetFullUrl(assetName)
            const match = await cache.match(url)
            labelBottom.text = `response url: ${url}\n
                response basePath: ${basePath}\n
                isCached: ${!!match}`
            working.value = false
          }
        })
      }
    }

    const buttonData = [
      new QuickButtonData('cacheInfo', async () => {
        if (working.value) {
          return
        }
        working.value = true

        if (supportsAssetCacheProxy()) {
          getLocalWebServer()
            .getCachedFileHashes()
            .then(data => {
              labelTop.text = `${data.sha256Hashes.length}`
              working.value = false
            })
        } else {
          try {
            const t = await getExhaustiveAndExpensiveCacheStorageInfo()
            await delayPromise(100)
            working.value = false
            labelBottom.text = `cacheMethod: ${t.method}\n
            cacheLimit: ${t.cacheLimit}\n
            cacheSizesBreakdown:\n ${Object.keys(t.cacheSizesBreakdown)
              .map(key => `  ${key} = ${t.cacheSizesBreakdown[key]}`)
              .join('\n')}\n`
          } catch (e) {
            working.value = false
            labelBottom.text = 'error calculating cacheInfo\n' + e
          }
        }
      }),
      new QuickButtonData('load assets', async () => {
        if (working.value) {
          return
        }
        working.value = true

        const concurrentReqs = 6
        await new Promise<void>(resolve => {
          const total = assetBasePaths.length
          let cursor = 0
          let totalLoaded = 0
          function next() {
            if (cursor >= total) {
              return
            }
            const basePath = assetBasePaths[cursor]
            const url = getAssetsManager().getFullUrl(basePath)
            labelTop.text = `request url: ${url}\n
            ${cursor + 1}/${total}`
            cursor++
            fetch(url).then(() => {
              totalLoaded++
              if (totalLoaded === total) {
                resolve()
              }
              next()
            })
          }
          for (let i = 0; i < concurrentReqs; i++) {
            next()
          }
        })
        labelBottom.text = 'assets loaded'
        working.value = false
      }),
      new QuickButtonData('are assets cached?', () => {
        if (working.value) {
          return
        }
        working.value = true

        const cacheStatuses = getCacheStatuses(
          assetBasePaths,
          getAssetsManager().manifestData!
        )
        let error = false
        const updateLineItem = throttle2(() => {
          if (error) {
            return
          }
          labelBottom.text = `${formatBytes(
            cacheStatuses.progress.cached.totalBytes
          )} / ${formatBytes(
            cacheStatuses.progress.cached.totalBytes +
              cacheStatuses.progress.notCached.totalBytes
          )}\n
            ${cacheStatuses.progress.cached.totalFiles} / ${
              cacheStatuses.progress.cached.totalFiles +
              cacheStatuses.progress.notCached.totalFiles
            }`
        }, 100)
        listenToProperty(
          cacheStatuses.progress.cached,
          'totalBytes',
          updateLineItem
        )
        listenToProperty(
          cacheStatuses.progress.notCached,
          'totalBytes',
          updateLineItem
        )
        const onCacheStatusError = (e: string) => {
          if (e) {
            labelBottom.text = e
            error = true
            working.value = false
            stopListeningToProperty(cacheStatuses, 'error', onCacheStatusError)
          }
        }
        listenToProperty(cacheStatuses, 'error', onCacheStatusError, true)
        cacheStatuses.data.then(() => {
          working.value = false
        })
      })
    ]

    function addAssetButtons(assetName: AssetName) {
      buttonData.push(
        new QuickButtonData(`load ${assetName}`, () => loadAsset(assetName)),
        new QuickButtonData(`is ${assetName} cached?`, () =>
          isAssetCached(assetName)
        )
      )
    }
    addAssetButtons('death_trigger_low')
    addAssetButtons('audioFxCommon')
    addAssetButtons('enchantmentChains')

    const buttons = makeQuickButtonColumn(
      container,
      buttonData,
      ReadonlyPin.BottomRight,
      ReadonlyPin.BottomRight.cloneOffset(-80, 0),
      12,
      200
    )
    let c = 0
    let iid: NodeJS.Timeout
    listenToProperty(working, 'value', v => {
      for (const button of buttons) {
        button.disabled = v
      }
      if (v) {
        iid = setInterval(() => {
          c++
          const t = loopy[c % loopy.length]
          labelCenter.text = `${t} please wait`
        }, 50)
      } else {
        clearInterval(iid)
        labelCenter.text = ''
      }
    })

    container.fadeIn()
    super.initUI(ui)
  }
}
export const scene = TestCacheInfoScene
