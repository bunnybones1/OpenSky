import { Element } from '@skyweaver/state-metadata'
import { Color } from 'three'

import { getAssetsManager } from '~/assets/index'
import {
  cardTypeColors,
  COLOR_DEEP_LILAC,
  COLOR_DUSTY_PURPLE,
  COLOR_WHITE
} from '~/colors/colorLibrary'
import { BREAKDOWN_BAR_HEIGHT, elementColors } from '~/constants'
import { Pin } from '~/helpers/LayoutHelpers'
import RectangleMaterial from '~/materials/RectangleMaterial'
import Mesh2D from '~/meshes/Mesh2D'
import * as textOptions from '~/systems/text/TextOptions'
import UITextMesh from '~/systems/text/UITextMesh'
import { getSharedRectangle2DBufferGeometry } from '~/utils/geometry'
import { cardTypeSymbols, elementSymbols } from '~/utils/symbolLibs'

import { IDeckBreakdownData } from './IDeckBreakdownData'

const INITIAL_X_OFFSET = 25
const INITIAL_Y_OFFSET = 10
const CATEGORY_PADDING = 12
const Y_STEP = 28
const X_STEP_SIZE = 25.75

const ORDERED_ELEMENTS: Element[] = [
  'water',
  'air',
  'earth',
  'fire',
  'dark',
  'light',
  'metal',
  'mind'
]

interface BreakDownColumnData {
  icon: string
  color: Color
  xOffset: number
  name: 'spell' | 'unit' | Element
  countLabel?: UITextMesh
}

export default class DeckBreakdownWidget {
  mesh: Mesh2D
  constructor(deckBreakdownData: IDeckBreakdownData, curved = false) {
    const breakdownBoxModel = curved ? 'breakdown-box-curved' : 'breakdown-box'
    const panel = getAssetsManager().fetchMeshDeepClone(
      'uiSmall',
      breakdownBoxModel,
      true,
      true
    )
    panel.shouldRenderAsGroup = true

    const columnData: Array<BreakDownColumnData> = []

    for (let index = 0; index < ORDERED_ELEMENTS.length; index++) {
      const element = ORDERED_ELEMENTS[index]
      const color = elementColors[element]
      const icon = elementSymbols[element]
      columnData.push({ icon, color, xOffset: 0, name: element })
    }

    columnData.push({
      icon: cardTypeSymbols.spell,
      color: cardTypeColors.spell,
      xOffset: CATEGORY_PADDING,
      name: 'spell'
    })
    columnData.push({
      icon: cardTypeSymbols.unit,
      color: cardTypeColors.unit,
      xOffset: CATEGORY_PADDING,
      name: 'unit'
    })

    for (let index = 0; index < columnData.length; index++) {
      const data = columnData[index]

      const countLabel = new UITextMesh(
        0,
        textOptions.breakdownLabel,
        undefined,
        undefined,
        (tm, val) => {
          tm.color = val === '0' ? COLOR_DUSTY_PURPLE : COLOR_WHITE
        }
      )

      const icon = new UITextMesh(data.icon, {
        ...textOptions.breakdownIcon,
        color: data.color
      })

      icon.matrix.setConstraintsPosition(
        Pin.fromPixels(
          INITIAL_X_OFFSET + data.xOffset + index * X_STEP_SIZE,
          INITIAL_Y_OFFSET
        )
      )
      panel.add(icon)

      countLabel.matrix.setConstraintsPosition(
        Pin.fromPixels(
          INITIAL_X_OFFSET + data.xOffset + index * X_STEP_SIZE,
          INITIAL_Y_OFFSET + Y_STEP
        )
      )

      panel.add(countLabel)

      data.countLabel = countLabel
    }

    const dividerOffset = (X_STEP_SIZE + CATEGORY_PADDING) / 2

    const dividerGeometry = getSharedRectangle2DBufferGeometry()
    const dividerMaterial = new RectangleMaterial({})
    const firstDividerMesh = new Mesh2D(dividerGeometry, dividerMaterial)
    firstDividerMesh.matrix.setConstraints(
      Pin.fromPixels(1, BREAKDOWN_BAR_HEIGHT - 2),
      Pin.fromPixels(0, 0),
      Pin.fromPixels(
        columnData[columnData.length - 2].countLabel!.matrix.offset.x.offset -
          dividerOffset,
        1
      )
    )
    firstDividerMesh.matrix.setColor(COLOR_DEEP_LILAC)
    panel.add(firstDividerMesh)

    const secondDividerMesh = new Mesh2D(dividerGeometry, dividerMaterial)
    secondDividerMesh.matrix.setConstraints(
      Pin.fromPixels(1, BREAKDOWN_BAR_HEIGHT - 2),
      Pin.fromPixels(0, 0),
      Pin.fromPixels(
        columnData[columnData.length - 1].countLabel!.matrix.offset.x.offset +
          dividerOffset,
        1
      )
    )
    secondDividerMesh.matrix.setColor(COLOR_DEEP_LILAC)
    panel.add(secondDividerMesh)

    this.mesh = panel

    deckBreakdownData.listenForChange(() => {
      for (const data of columnData) {
        if (data.name === 'unit') {
          data.countLabel!.text = deckBreakdownData.unitCounter
        } else if (data.name === 'spell') {
          data.countLabel!.text = deckBreakdownData.spellCounter
        } else {
          data.countLabel!.text = deckBreakdownData.elementCounter[data.name]
        }
      }
    })
  }
}
