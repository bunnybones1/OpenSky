import { Object3D } from 'three'

import { ColorMaker } from '~/meshes/Particles/ColorMaker'
import { emitParticlesInLineShape } from '~/systems/animation/emitParticlesInLineShape'

import { cardShapeTightCoords } from './shapeHelpers'

export function startGraveyardElementalSoulsEffect(
  target: Object3D,
  colorMaker: ColorMaker
) {
  return emitParticlesInLineShape(
    target,
    cardShapeTightCoords,
    'elementalSouls',
    colorMaker
  )
}
