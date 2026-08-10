import { i18n } from '@opensky/language-manager'
import { TextureAssetName } from '@opensky/shared/assets'
import { DropFirst } from '@opensky/shared/typeHelpers'
import NiceBooleanParameter from '@opensky/shared/utils/NiceBooleanParameter'
import NiceElement, { NiceCategory } from '@opensky/shared/utils/NiceElement'
import NiceFloatParameter from '@opensky/shared/utils/NiceFloatParameter'
import NiceParameter from '@opensky/shared/utils/NiceParameter'

import { getAssetsManager } from '~/assets'
import { COLOR_MODAL_OUTLINE_PURPLE } from '~/colors/colorLibrary'
import {
  BUTTON_HEIGHT,
  BUTTON_MARGINS,
  SLIDER_HEIGHT,
  SLIDER_MARGINS
} from '~/constants'
import { PickerPin, Pin, ReadonlyPin } from '~/helpers/LayoutHelpers'
import RectangleMaterial from '~/materials/RectangleMaterial'
import Mesh2D from '~/meshes/Mesh2D'
import Object2D from '~/meshes/Object2D'
import Checkbox from '~/scenes/ui/components/Checkbox'
import { mobileHeadOffset } from '~/scenes/ui/components/Modal'
import NiceButton from '~/scenes/ui/components/NiceButton'
import PinnedButton from '~/scenes/ui/components/PinnedButton'
import ScrollView from '~/scenes/ui/components/ScrollView'
import Slider from '~/scenes/ui/components/Slider'
import { fontFaces } from '~/systems/text/FontFace'
import * as textOptions from '~/systems/text/TextOptions'
import UITextMesh from '~/systems/text/UITextMesh'

import { getSharedRectangle2DBufferGeometry } from './geometry'
import NiceColorParameter from './NiceColorParameter'
import NiceMethod from './NiceMethod'
import NiceVector2Parameter from './NiceVector2Parameter'
import NiceVector3Parameter from './NiceVector3Parameter'
import { createButton, createButtonText, createGenericModal } from './ui'

// function getPassthroughColor(name: string) {
//   if (name.includes('emission')) {
//     return COLOR_BLACK
//   } else {
//     return COLOR_WHITE
//   }
// }

export async function createNiceModal(
  niceElements: NiceElement[],
  title?: string,
  cornerButton?: { onClick: (button: PinnedButton) => void; text: string },
  buttonHeight = BUTTON_HEIGHT,
  marginHeight = SLIDER_MARGINS,
  scissor = false,
  close?: () => void,
  alphaTextureAsset?: TextureAssetName
) {
  await getAssetsManager().loadAsset('uiSmall')
  niceElements.sort((a, b) => b.orderPriority - a.orderPriority)

  const titleHeight = title ? 60 + mobileHeadOffset : 0
  const modal = createGenericModal('none', 'none', alphaTextureAsset)

  const contentsSizePin = Pin.fromPixels(650, 100)
  const modalHeader = new Object2D()
  modalHeader.shouldRenderAsGroup = true
  modal.mesh.add(modalHeader)
  modal.mesh.matrix.setConstraints(
    new PickerPin(Math.min, contentsSizePin, ReadonlyPin.FullSize)
  )

  let cursor = marginHeight
  if (title) {
    const textMesh = new UITextMesh(title, textOptions.modalTitle)
    textMesh.matrix.setConstraintsPosition(
      ReadonlyPin.Top.cloneOffset(0, 27 + mobileHeadOffset)
    )
    modalHeader.add(textMesh)
    const line = new Mesh2D(
      getSharedRectangle2DBufferGeometry(),
      new RectangleMaterial({})
    )
    line.matrix.setConstraints(
      new Pin(1, 0, -2, 1),
      ReadonlyPin.Center,
      ReadonlyPin.Top.cloneOffset(0, titleHeight)
    )
    line.matrix.setColor(COLOR_MODAL_OUTLINE_PURPLE)
    modalHeader.add(line)
    cursor += titleHeight
  }

  const scroller = new ScrollView({
    scrollAxis: 'y',
    overflowEnd: marginHeight,
    overflowStart: marginHeight,
    scissor
  })
  scroller.matrix.setConstraints(
    new Pin(1, 1, 0, -cursor - marginHeight),
    ReadonlyPin.Top,
    ReadonlyPin.Top.cloneOffset(0, cursor)
  )
  modal.mesh.add(scroller)
  niceElements.forEach(np => {
    let uiElement: Slider | Checkbox | NiceButton | undefined

    let elHeight = SLIDER_HEIGHT
    const elLength = 150
    let containerHeight = elHeight + marginHeight
    if (np instanceof NiceBooleanParameter) {
      uiElement = new Checkbox(np)
      elHeight += 10
    } else if (np instanceof NiceVector3Parameter) {
      // uiElement = new Vector3Manipulator(np)
    } else if (np instanceof NiceVector2Parameter) {
      // uiElement = new Vector2Manipulator(np)
    } else if (np instanceof NiceColorParameter) {
      // uiElement = new PLABColorPicker(np, getPassthroughColor(np.name))
    } else if (np instanceof NiceFloatParameter) {
      uiElement = new Slider(np)
    } else if (np instanceof NiceMethod) {
      uiElement = new NiceButton(np)
      elHeight = buttonHeight
      containerHeight = elHeight + BUTTON_MARGINS
    }
    if (uiElement) {
      uiElement.mesh.matrix.setConstraints(Pin.fromPixels(elLength, elHeight))
      const container = new Object2D()
      container.matrix.setConstraints(
        Pin.fromPixels(elLength, containerHeight),
        ReadonlyPin.Top,
        ReadonlyPin.Top.clone()
      )

      container.add(uiElement.mesh)
      scroller.push(container)
      cursor += containerHeight
    }
  })
  cursor += marginHeight
  contentsSizePin.y.offset = cursor

  if (cornerButton) {
    const backButton = createButton(
      modalHeader,
      () => cornerButton.onClick(backButton),
      Pin.fromPixels(buttonHeight, buttonHeight),
      ReadonlyPin.TopLeft,
      ReadonlyPin.TopLeft.cloneOffset(18, 10)
    )
    createButtonText(backButton.mesh, cornerButton.text, {
      ...textOptions.optionsButtonText,
      fontFace: fontFaces.BarlowBold,
      size: 24
    })
  }
  if (close) {
    const doneButton = createButton(
      modalHeader,
      () => close(),
      Pin.fromPixels(70, buttonHeight),
      ReadonlyPin.TopRight,
      ReadonlyPin.TopRight.cloneOffset(-18, 10)
    )
    createButtonText(doneButton.mesh, i18n.t('common:options.done'), {
      ...textOptions.optionsButtonText,
      size: 20
    })
  }
  return {
    modal,
    updateModalScroller: (dt: number) => {
      scroller.update(dt)
    }
  }
}

export function createCategoricalNiceModal(
  category: NiceCategory,
  ...args: DropFirst<Parameters<typeof createNiceModal>>
) {
  const niceParams = NiceParameter.registry.filter(
    np => np.category === category
  )

  return createNiceModal(niceParams, ...args)
}
