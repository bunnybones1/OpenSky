import { Trait } from '@skyweaver/state-metadata'
import { Object3D } from 'three'

import TraitBadgeMesh from '~/meshes/TraitBadgeMesh'

const SPACING = 0.007
const BADGE_HEIGHT = 0.01
const LEFT_MARGIN = 0.0048

export function makeTraitBadgeHolder(
  traits: Trait[],
  availableRows = 1,
  hasRuleText: boolean = true
) {
  const useLabels = traits.length <= availableRows * 2
  const badges = traits
    .map(tr => new TraitBadgeMesh(tr, useLabels))
    .filter(a => a !== undefined)
  if (badges.length > 0) {
    const traitsHolder = new Object3D()
    const rows: TraitBadgeMesh[][] = []
    let row: TraitBadgeMesh[] | undefined
    for (const badge of badges) {
      traitsHolder.add(badge)
      if (!row || (row.length >= 2 && useLabels)) {
        row = []
        rows.push(row)
      }
      row.push(badge)
    }

    function solveLayout() {
      let cursorY = hasRuleText
        ? 0
        : 0.05 / 2 - ((BADGE_HEIGHT + SPACING) * rows.length) / 2
      for (row of rows) {
        const widthHalf =
          (SPACING * (row.length - 1) + row.reduce((o, b) => o + b.width, 0)) *
          0.5
        let cursorX = 0
        for (const badge of row) {
          badge.position.x = cursorX - widthHalf + LEFT_MARGIN
          badge.position.z = cursorY
          cursorX += badge.width + SPACING
        }
        cursorY += BADGE_HEIGHT + SPACING
      }
    }
    solveLayout()
    for (const badge of badges) {
      badge.onMeasurementsUpdated = solveLayout
    }
    return traitsHolder
  }
  return undefined
}
