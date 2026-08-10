import './debug'

import device from '@opensky/shared/device'
import { isWasmAvailable, isWebGLAvailable } from '@opensky/shared/utils'
import { Archetype } from 'gg'
import { Howler } from 'howler'

import { logMastHead } from './aaaRunFirst'
import * as archetypes from './archetypes'
import env from './env'
import { onAbortError } from './helpers/abortError'
import { gameMode } from './helpers/envGameModeHelpers'
import main from './main'
import queryParams from './queryParams'
import renderer from './renderer'
import { removeLoadingSpinner } from './scenes/ui/removeLoadingSpinner'
import { accountsLoaded } from './state'
import { accountsStore } from './state/AccountStore'
import { doesTestExist, runTestByPath } from './tests'
import { TrackableCollection } from './utils/TrackableCollection'
import { world } from './world'


logMastHead()

// Set initial audio mute state
const isMuted = localStorage.getItem('opensky-settings-mute-audio') === 'true'
Howler.mute(isMuted)

// Add all archetypes to world
for (const archetype of Object.values(archetypes)) {
  if (!(archetype.prototype instanceof Archetype)) {
    continue
  }

  world.addArchetype(archetype)
}

;(async function () {
  TrackableCollection.lock()
  try {
    if (!isWebGLAvailable()) {
      throw new Error('Your browser does not support WebGL.')
    }

    if (!isWasmAvailable()) {
      throw new Error('Your browser does not support WebAssembly.')
    }
    // Add Renderer
    document.body.appendChild(renderer.domElement)
    if (queryParams.code) {
      const crowdin = await import('./crowdin.js')
      await crowdin.finishSignIn(queryParams.code)
    } else if (
      !queryParams.mode ||
      (queryParams.test && doesTestExist(queryParams.test))
    ) {
      removeLoadingSpinner()
      await runTestByPath(queryParams.test ?? 'cardViewer')
    } else {
      await Promise.all([main(), onAbortError])
    }
  } catch (err) {
    console.error(err)
    const errText = (
      typeof err === 'string'
        ? err
        : err instanceof Error || (typeof err === 'object' && 'message' in err)
        ? err.message
        : `${err}`
    ).replace(/\n/g, '</p><p>')
    document.body.insertAdjacentHTML(
      'beforeend',
      `
  <div id="error">
  <p>Sorry, OpenSky ran into a problem:</p>
  <p>${errText.slice(0, 512)}<p>
  <p>If you're using an old version, try updating ${
    device.isIOS ? 'your iOS version and/or' : ''
  } your browser.</p>
  <p>Otherwise, try reloading.</p>
  <p>&nbsp;</p>
  <a href="${env.WEBAPP_URL}">Back</a>
  <a href="#" onClick="window.location.reload();">Reload</a>
  </div>
  `
    )
  }
})()
