import { StickerLibrary } from '@opensky/shared/cosmetics'
import { Texture } from 'three'

import apiClient from '~/apiClient'
import { getAssetsManager } from '~/assets'
import { BUTTON_MARGINS, END_TURN_BUTTON_HEIGHT } from '~/constants'
import { Pin, ReadonlyPin } from '~/helpers/LayoutHelpers'
import RectangleMaterial from '~/materials/RectangleMaterial'
import RectangleMesh from '~/meshes/RectangleMesh'
import queryParams from '~/queryParams'
import { store } from '~/state'
import { Easing } from '~/systems/animation/Easing'
import { fontFaces } from '~/systems/text/FontFace'
import * as textOptions from '~/systems/text/TextOptions'
import UITextMesh from '~/systems/text/UITextMesh'
import { AnimatedBool } from '~/utils/AnimatedBool'
import { makeInteractive } from '~/utils/makeInteractive'
import { getTempTexture } from '~/utils/tempTexture'
import { safelyResetFlipY } from '~/utils/textureUtils'
import { createButton, createButtonText } from '~/utils/ui'

import { UI } from '..'
import UIContainer from '../components/UIContainer'
import { makeInteractiveSpeechBubble } from '../components/utils/speechBubbleUtils'
import { goBackToWebapp } from '../helpers'
const STICKER_SIZE = 120
const MARGINS = 14
const TOP_MARGIN = 28
export default class SpectatorStickersContainer extends UIContainer {
  constructor(ui: UI, priority: number) {
    super(ui, 'spectatorStickers', {
      priority
    })
  }
  protected async init() {
    //
    const mesh = getAssetsManager().fetchMeshDeepClone(
      'uiSmall',
      'info-box',
      true,
      true
    )
    this.add(mesh)

    let ownedStickerStrings: string[] = []
    if (queryParams.fakeStickers) {
      ownedStickerStrings = queryParams.fakeStickers.split(',')
    } else {
      try {
        const s = await apiClient
          .getStickerOwnership({ accountAddress: store.localAccount.address })
          .then(a => a.res.stickerBalances)
        ownedStickerStrings = Object.keys(s)
      } catch {
        // no problem, no stickers
      }
    }
    const ownedStickers = ownedStickerStrings
      .map(n => Number.parseInt(n, 10))
      .filter(s => StickerLibrary.has(s))
    ownedStickers.forEach((stickerID, index) => {
      const stickerMesh = new RectangleMesh(
        new RectangleMaterial({
          map: getTempTexture(),
          forceTransparent: true
        })
      )
      const stickerName = StickerLibrary.get(stickerID)?.artID
      if (!stickerName) {
        return
      }
      const stickerUrl = `game/stickers/${stickerName}.png`
      getAssetsManager()
        .load('texture', stickerUrl)
        .then((texture: Texture) => {
          safelyResetFlipY(texture)
          stickerMesh.material.uniforms.mapTexture.value = texture
        })
      stickerMesh.matrix.setConstraints(
        Pin.fromPixels(STICKER_SIZE, STICKER_SIZE),
        ReadonlyPin.Center,
        ReadonlyPin.TopLeft.cloneOffset(
          // center if we're an odd # of stickers
          index % 2 === 0 && index === ownedStickers.length - 1
            ? MARGINS * 1.5 + STICKER_SIZE
            : MARGINS +
                (index % 2 == 1 ? MARGINS + STICKER_SIZE : 0) +
                STICKER_SIZE / 2,
          TOP_MARGIN +
            Math.floor(index / 2) * (STICKER_SIZE + MARGINS) +
            STICKER_SIZE / 2
        )
      )
      mesh.add(stickerMesh)
      const animatedSize = new AnimatedBool(
        v => {
          const scale = STICKER_SIZE + v * STICKER_SIZE * 0.1
          stickerMesh.matrix.size.x.offset = scale
          stickerMesh.matrix.size.y.offset = scale
        },
        false,
        80,
        Easing.Quadratic.Out
      )
      makeInteractive(stickerMesh, {
        cursor: 'pointer',
        onOver: () => {
          animatedSize.value = true
        },
        onOut: () => {
          animatedSize.value = false
        },
        onSelect: () => {
          store.sticker(stickerID)
          this.fadeOut()
        }
      })
    })

    if (ownedStickers.length === 0) {
      const stickerMesh = new RectangleMesh(
        new RectangleMaterial({
          map: getTempTexture(),
          forceTransparent: true
        })
      )
      getAssetsManager()
        .load('texture', 'game/ui/dummy-sticker.png')
        .then((texture: Texture) => {
          safelyResetFlipY(texture)
          stickerMesh.material.uniforms.mapTexture.value = texture
        })
      stickerMesh.matrix.setConstraints(
        Pin.fromPixels(STICKER_SIZE, STICKER_SIZE),
        ReadonlyPin.Bottom,
        ReadonlyPin.Center
      )
      stickerMesh.matrix.opacity = 0.6
      mesh.add(stickerMesh)
      mesh.matrix.setConstraints(
        Pin.fromPixels(
          STICKER_SIZE * 2 + MARGINS * 3,
          2 * (STICKER_SIZE + MARGINS) + TOP_MARGIN
        ),
        ReadonlyPin.BottomRight,
        ReadonlyPin.BottomRight.cloneOffset(
          -BUTTON_MARGINS,
          -END_TURN_BUTTON_HEIGHT - 12 - BUTTON_MARGINS
        )
      )
      const text = new UITextMesh('Invite friends to collect stickers!', {
        ...textOptions.generic,
        fontFace: fontFaces.BarlowBold,
        color: '#826cc6'
      })
      text.matrix.setConstraintsPosition(ReadonlyPin.Center.cloneOffset(0, 20))
      mesh.add(text)
      const button = createButton(mesh, () => {
        goBackToWebapp()
      })
      createButtonText(button.mesh, 'Go Home')
      button.mesh.matrix.setConstraints(
        undefined,
        ReadonlyPin.Center,
        ReadonlyPin.Center.cloneOffset(0, 70)
      )
    } else {
      mesh.matrix.setConstraints(
        Pin.fromPixels(
          STICKER_SIZE * 2 + MARGINS * 3,
          Math.floor((ownedStickers.length + 1) / 2) *
            (STICKER_SIZE + MARGINS) +
            TOP_MARGIN
        ),
        ReadonlyPin.BottomRight,
        ReadonlyPin.BottomRight.cloneOffset(
          -BUTTON_MARGINS,
          -END_TURN_BUTTON_HEIGHT - 12 - BUTTON_MARGINS
        )
      )
    }

    const backButton = makeInteractiveSpeechBubble(
      { icon: 'back' },
      'none',
      () => this.fadeOut()
    )
    mesh.add(backButton)
    backButton.matrix.setConstraints(
      undefined,
      ReadonlyPin.Center,
      ReadonlyPin.Top
    )
  }
}
