import { formatBytes } from '@opensky/shared/formatBytes'
import { getAssetPaths } from '@opensky/shared/naiveGameAssets'
import { getLocalWebServer } from '@opensky/shared/opensky-webserver/index'
import { shuffleArray } from '@opensky/shared/utils/arrayUtils'
import { sha256 } from 'hash.js'
import { memo } from 'react'
import { useSnapshot } from 'valtio'

import { FlexBox } from '~/shared/components/Base'
import { Text } from '~/shared/components/Base'
import { Button } from '~/shared/components/Button'
import { NAVBAR_WIDTH } from '~/shared/constants/ui'
import { getAssetManifest } from '~/shared/queries/useAssetManifest'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { AccountIdentityStyle } from '../AccountPage/AccountIdentity/AccountIdentity.css'
import { debugData } from './debugData'

class DebugFunc {
  constructor(
    public key: string,
    public description: string,
    public label: string,
    public cb: () => void
  ) {
    //
  }
}

function genericErrorReport(e: any) {
  debugData.message1 = `${e.message} (${new Date()})`
  debugData.message2 = e.stack
}

function resetErrorReport() {
  debugData.message1 = `ready.`
  debugData.message2 = '...'
}

const debugFuncs: DebugFunc[] = [
  new DebugFunc('loadUrl', 'load url', 'Go to URL', () => {
    const url = window.prompt(
      'Enter a URL',
      localStorage.getItem('debug-custom-url') || 'https://www.skyweaver.net/'
    )
    if (url) {
      localStorage.setItem('debug-custom-url', url)
      window.location.href = url
    }
  }),
  new DebugFunc('reportURL', 'report current url', 'Where am I?', () => {
    window.alert(`Currently at: ${window.location.href}`)
  }),
  new DebugFunc(
    'listAssetsUrls',
    'list asset urls needed to load',
    'List Needed Asset URLs',
    () => {
      resetErrorReport()
      getAssetManifest('game').then((d) => {
        const allPaths = getAssetPaths('current_device')
        const fullUrls = allPaths.map((p) => d.getFullUrl(p))
        const fullSizes = allPaths.reduce((pv, cv) => pv + d.getFilesize(cv), 0)
        debugData.message3 = `${fullUrls.length} files. ${formatBytes(fullSizes, 2)}.`
        debugData.message4 = fullUrls.join(' ')
      })
    }
  ),
  new DebugFunc(
    'listAssetsUrlSha256s',
    'list asset url sha256s needed to load',
    'List Needed Asset URL Sha256s',
    () => {
      resetErrorReport()
      getAssetManifest('game').then((d) => {
        const allPaths = getAssetPaths('current_device')
        const fullUrls = allPaths.map((p) => d.getFullUrl(p))
        const urlsHashes = fullUrls.map((url) => sha256().update(url).digest('hex'))
        debugData.message3 = `${urlsHashes.length} files.`
        debugData.message4 = urlsHashes.join(' ')
      })
    }
  ),
  new DebugFunc(
    'listProxy CachedUrlSha256s',
    'list proxy cached url sha256s from proxy',
    'List Proxy Cached URL Sha256s',
    () => {
      resetErrorReport()
      // getAssetManifest('game').then((d) => {
      // const allPaths = getAssetPaths('current_device')
      // const fullUrls = allPaths.map((p) => d.getFullUrl(p))
      getLocalWebServer()
        .getCachedFileHashes()
        .then((cachedUrlSha256s) => {
          debugData.message3 = `${cachedUrlSha256s.sha256Hashes.length} hashes.`
          debugData.message4 = cachedUrlSha256s.sha256Hashes.join(' ')
        })
        .catch(genericErrorReport)
      // })
    }
  ),
  new DebugFunc(
    'listUncachedNeededUrlSha256s',
    'list uncached needed URL sha256s',
    'List Uncached Needed URL Sha256s',
    () => {
      resetErrorReport()
      getAssetManifest('game').then((d) => {
        const allPaths = getAssetPaths('current_device')
        const rawUrls = allPaths.map((p) => d.getFullUrl(p))
        const urlsHashes = rawUrls.map((rawUrl) => {
          const rawUrlChunks = rawUrl.split('/_proxy/')
          const url = rawUrlChunks[rawUrlChunks.length - 1]
          return sha256().update(url).digest('hex')
        })
        getLocalWebServer()
          .getCachedFileHashes()
          .then((cachedUrlSha256s) => {
            const uncachedUrlSha256s = urlsHashes.filter(
              (h) => !cachedUrlSha256s.sha256Hashes.includes(h)
            )
            debugData.message3 = `${uncachedUrlSha256s.length} missing files.`
            debugData.message4 = uncachedUrlSha256s.join(' ')
          })
          .catch(genericErrorReport)
      })
    }
  ),
  new DebugFunc(
    'listUncachedNeededUrls',
    'list uncached needed URLs',
    'List Uncached Needed URLs',
    () => {
      getAssetManifest('game').then((d) => {
        resetErrorReport()
        const allPaths = getAssetPaths('current_device')
        const rawUrls = allPaths.map((p) => d.getFullUrl(p))
        const urls = rawUrls.map((rawUrl) => {
          const rawUrlChunks = rawUrl.split('/_proxy/')
          return rawUrlChunks[rawUrlChunks.length - 1]
        })
        const urlHashes = urls.map((url) => sha256().update(url).digest('hex'))
        getLocalWebServer()
          .getCachedFileHashes()
          .then((cachedUrlSha256s) => {
            const uncachedUrlSha256s = urlHashes.filter(
              (h) => !cachedUrlSha256s.sha256Hashes.includes(h)
            )
            debugData.message3 = `${uncachedUrlSha256s.length} missing files.`
            debugData.message4 = uncachedUrlSha256s
              .map((hash) => urls[urlHashes.indexOf(hash)])
              .join(' ')
          })
          .catch(genericErrorReport)
      })
    }
  ),
  new DebugFunc(
    'uncache100RandomFiles',
    'uncache 100 random files',
    'Uncache 100 random files',
    async () => {
      resetErrorReport()
      const pCachedUriHashes = getLocalWebServer().getCachedFileHashes()
      pCachedUriHashes.catch(genericErrorReport)
      const cachedUriHashes = (await pCachedUriHashes).sha256Hashes
      shuffleArray(cachedUriHashes)
      const total = Math.min(100, cachedUriHashes.length)
      const randomSubsetOfHashes = cachedUriHashes.slice(0, total)
      debugData.message3 = `deleting`
      debugData.message4 = `deleting ${randomSubsetOfHashes.join(' ')}`
      const pResult = getLocalWebServer().invalidateCachedFilesByHash({
        sha256Hashes: randomSubsetOfHashes
      })
      pResult.catch(genericErrorReport)
      const result = await pResult
      if (result.ok) {
        debugData.message3 = `success`
      } else {
        debugData.message3 = `fail`
      }
    }
  )
]

const SecretDebug = memo(() => {
  const debugDataObj = useSnapshot(debugData)
  return (
    <FlexBox
      width="100%"
      className={AccountIdentityStyle}
      pl={[NAVBAR_WIDTH, NAVBAR_WIDTH, NAVBAR_WIDTH, 0]}
      pb={[0, 0, 0, 24]}
      flexDirection="column"
      alignItems="center"
      justifyContent="flex-start"
    >
      <FlexBox
        type="centered-start-column"
        maxWidth={800}
        width="100%"
        px={48}
        pt={[8, 32, 32, 8]}
      >
        <Text
          mb="24px"
          fontFamily="mono"
          color="white"
          fontWeight="medium"
          fontSize={18}
        >
          {'SECRET DEBUG MENU'}
        </Text>
        {debugFuncs.map((data) => {
          return (
            <FlexBox
              alignItems="center"
              justifyContent="flex-start"
              width="100%"
              key={data.key}
              flexWrap="nowrap"
            >
              <Text
                mb="16px"
                fontFamily="mono"
                color="purple9"
                fontWeight="medium"
                fontSize={16}
                mr="auto"
                textWrap
              >
                {`${data.description}:`}
              </Text>
              <Button
                text={data.label}
                frameType="default"
                colorType="default"
                onClick={data.cb}
                buttonClassName={Sprinkles({
                  paddingX: '4px'
                })}
              />
            </FlexBox>
          )
        })}
        {[
          debugDataObj.message1,
          debugDataObj.message2,
          debugDataObj.message3,
          debugDataObj.message4
        ].map((message, i) => {
          return (
            <FlexBox
              alignItems="center"
              justifyContent="flex-start"
              width="100%"
              key={'debugMessage' + i}
              flexWrap="nowrap"
            >
              <Text
                mb="16px"
                fontFamily="mono"
                color="white"
                fontWeight="regular"
                fontSize={12}
                mr="auto"
                textWrap
              >
                {message}
              </Text>
            </FlexBox>
          )
        })}
      </FlexBox>
    </FlexBox>
  )
})

SecretDebug.displayName = 'SecretDebug'

export default SecretDebug
