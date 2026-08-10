import { getRandom } from '@opensky/shared/utils/arrayUtils'
import { Rarity } from '@skyweaver/state-metadata'
import { Object3D } from 'three'

import { getAssetsManager } from '~/assets/index'
import { UnlockedRarityStrings } from '~/helpers/typeHelpers'
import queryParams from '~/queryParams'

import { findObject3DsWhoseNamesInclude } from './threeUtils'
import { copyTransform } from './transformUtils'

const __raritiesWithPrivacy: Rarity[] = ['silver', 'gold']
const __frameBasesWithPrivacy = ['card']

const __coreFrameName = '-frame-'

export function changeFrameRarity(
  visualsRoot: Object3D,
  rarity: Rarity,
  publicRarity = false,
  hasPrism = true,
  backless = false
) {
  if (queryParams.randomRarity) {
    rarity = getRandom(UnlockedRarityStrings)
  } else if (queryParams.forceRarity) {
    rarity = queryParams.forceRarity as Rarity
  }
  const oldFrames = findObject3DsWhoseNamesInclude(visualsRoot, __coreFrameName)
  const baseNames = new Map<string, Object3D>()
  for (const mesh of oldFrames) {
    baseNames.set(mesh.name.split(__coreFrameName)[0], mesh)
  }
  const replacements = new Map<string, string>()
  try {
    for (const baseName of baseNames.keys()) {
      const normalCard = baseName === 'card'
      const tempRarity = normalCard
        ? rarity
        : rarity === 'none'
        ? 'base'
        : rarity
      const privacyPossible =
        __raritiesWithPrivacy.includes(tempRarity) &&
        __frameBasesWithPrivacy.includes(baseName)
      let newFrameName = ''
      const privacyFlag = !privacyPossible
        ? ''
        : publicRarity
        ? '-public-DO-NOT-BAKE'
        : '-private'
      const prismlessFlag =
        !normalCard || hasPrism || rarity === 'none' ? '' : '-prismless'
      const backlessFlag =
        normalCard && !publicRarity && rarity !== 'none' && backless
          ? '-backless'
          : ''
      newFrameName = `${baseName}${__coreFrameName}${tempRarity}${privacyFlag}${backlessFlag}${prismlessFlag}`
      const newFrame = getAssetsManager()
        .fetchMeshDeepClone(
          'gamePiecesPhysical',
          newFrameName,
          baseName === 'holographic',
          false
        )
        .clone()
      const oldFrame = baseNames.get(baseName)!
      replacements.set(baseName, newFrameName)
      if (!normalCard) {
        copyTransform(newFrame, oldFrame)
      }
      if (baseName.includes('trigger')) {
        for (let i = oldFrame.children.length - 1; i >= 0; i--) {
          newFrame.add(oldFrame.children[i])
        }
      }
      oldFrame.parent!.add(newFrame)
    }
    for (const mesh of oldFrames) {
      mesh.parent!.remove(mesh)
    }
  } catch (err) {
    console.warn('invalid frame, failed to apply style:', err)
  }
}
