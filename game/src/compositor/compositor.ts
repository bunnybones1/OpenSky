import '../debug'

import { renderMetrics } from '@opensky/shared/renderMetrics'
import { isWasmAvailable, isWebGLAvailable } from '@opensky/shared/utils'
import { Archetype } from 'gg'

import * as archetypes from '../archetypes/index'
import renderer from '../renderer'
import { removeLoadingSpinner } from '../scenes/ui/removeLoadingSpinner'
import { runTestByPath } from '../tests/index'
import { world } from '../world'

// Add all archetypes to world
for (const archetype of Object.values(archetypes)) {
  if (!(archetype.prototype instanceof Archetype)) {
    continue
  }

  world.addArchetype(archetype)
}

try {
  if (!isWebGLAvailable()) {
    throw new Error('Your browser does not support WebGL.')
  }

  if (!isWasmAvailable()) {
    throw new Error('Your browser does not support WebAssembly.')
  }
  // Add Renderer
  document.body.appendChild(renderer.domElement)
  removeLoadingSpinner()
  renderMetrics.overridePixelRatio = 2
  runTestByPath('cardComposite')
} catch (err) {
  console.error(err)
}
