import { Prism } from '@skyweaver/state-metadata'
import { Object3D } from 'three'

import { prismsArr } from '~/constants'
import { findObject3DsWhoseNamesInclude } from '~/utils/threeUtils'

export function managePrismGems(visualsRoot: Object3D, prisms: Prism[]) {
  const badPrisms = prismsArr.filter(p => !prisms.includes(p))
  const prismNodes = findObject3DsWhoseNamesInclude(visualsRoot, 'prism')
  const selectedPrismNodes = prismNodes.filter(prismNode => {
    const name = prismNode.name.toLowerCase().split('00')[0]
    for (const p of badPrisms) {
      if (name.includes(p)) {
        return false
      }
    }
    for (const p of prisms) {
      if (!name.includes(p)) {
        return false
      }
    }
    return true
  })
  if (selectedPrismNodes.length !== 1) {
    // throw new Error('Could not find correct prism node')
  }
  const prism = selectedPrismNodes[0]
  for (const node of prismNodes) {
    if (node !== prism) {
      node.parent!.remove(node)
    }
  }
}
