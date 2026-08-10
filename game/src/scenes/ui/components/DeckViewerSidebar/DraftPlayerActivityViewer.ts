import { CardLibrary } from '@skyweaver/state-metadata'
import { ClampToEdgeWrapping, Color } from 'three'

import { getAssetsManager } from '~/assets'
import { PaletteMesh2D } from '~/assets/MeshTypes'
import { PALETTE_ROW } from '~/constants'
import { makeSuperOpaque } from '~/helpers/I2D'
import { Pin, PinVal, ReadonlyPin } from '~/helpers/LayoutHelpers'
import RectangleMaterial from '~/materials/RectangleMaterial'
import Matrix2DUI from '~/meshes/Matrix2DUI'
import Object2D from '~/meshes/Object2D'
import RectangleMesh from '~/meshes/RectangleMesh'
import { cardName } from '~/systems/text/TextOptions'
import UITextMesh from '~/systems/text/UITextMesh'
import { attemptMoveMatrix } from '~/tests/draftMockup/attemptMove2D'
import DraftState, { DraftStatePlayer } from '~/tests/draftMockup/DraftState'
import SafeListeners from '~/utils/helpers/SafeListeners'
import { safelyResetFlipY } from '~/utils/textureUtils'

import PinnedButton from '../PinnedButton'
const BG_COLOR = new Color('rgb(10, 7, 28)')

const playerBarWidth = 240
const playerBarHeight = 40
const horMarginPercent = 0.04
const pinVals = {
  left: new PinVal(horMarginPercent, playerBarWidth * 0.5),
  right: new PinVal(1 - horMarginPercent, -playerBarWidth * 0.5),
  bottom: new PinVal(1, -playerBarHeight * 0.75),
  top: new PinVal(1, -playerBarHeight * 2.25),
  middle: new PinVal(0.5, 0)
}

const positions = [
  [pinVals.middle, pinVals.top],
  [pinVals.right, pinVals.middle],
  [pinVals.middle, pinVals.bottom],
  [pinVals.left, pinVals.middle]
]

type ArrowType = 'dr' | 'ru' | 'ul' | 'ld'
export default class DraftPlayerActivityViewer extends Object2D {
  deckButton: PinnedButton
  graveButton: PinnedButton

  constructor(state: DraftState, safe: SafeListeners) {
    super()

    const backgroundMesh = getAssetsManager().fetchMeshDeepClone(
      'uiSmall',
      'rectangle-double-outline-shadowed',
      true
    )

    const backgroundMeshOpaque = getAssetsManager().fetchMeshDeepClone(
      'uiSmall',
      'rectangle',
      true
    )
    makeSuperOpaque(backgroundMeshOpaque)
    backgroundMeshOpaque.matrix.setColor(BG_COLOR)

    this.add(backgroundMesh)
    this.add(backgroundMeshOpaque)

    const arrowContainer = new Object2D()
    this.add(arrowContainer)

    const playerContainer = new Object2D()
    this.add(playerContainer)

    const cornerHeight = 20
    const prescale = 3
    const d = 10
    const arrows = new Map<ArrowType, PaletteMesh2D>()
    const getArrow = (arrowType: ArrowType) => {
      if (!arrows.has(arrowType)) {
        const arrowMesh = getAssetsManager().fetchMeshDeepClone(
          'uiSmall',
          'curved-box-arrow-ccw-' + arrowType,
          true
        )
        arrowMesh.matrix.unlockConstraints()
        arrowMesh.material.paletteRow = PALETTE_ROW.BLACK_AND_WHITE
        arrowMesh.matrix.prescale.setScalar(prescale)
        arrowContainer.add(arrowMesh)
        arrows.set(arrowType, arrowMesh)
      }
      return arrows.get(arrowType)!
    }

    playerContainer.shouldRenderAsGroup = true
    const infoBoxes = new Map<DraftStatePlayer, Object2D>()
    safe.listenForAdd(state.players, player => {
      const infoBox = getAssetsManager().fetchMeshDeepClone(
        'uiSmall',
        'info-box',
        true
      )
      infoBox.matrix.setConstraints(
        new Pin(0, 0, playerBarWidth, playerBarHeight)
      )
      infoBox.matrix.unlockConstraints()
      const i = state.players.items.indexOf(player)
      infoBox.matrix.offset.x = positions[i][0]
      infoBox.matrix.offset.y = positions[i][1]

      const headSpace = getAssetsManager().fetchMeshDeepClone(
        'uiSmall',
        'circle-filled-outline-outer',
        true
      )
      headSpace.matrix.setConstraints(
        new Pin(0, 0, 56, 56),
        new Pin(0.5, 0.5),
        new Pin(0, 0.5, 18, 1)
      )
      headSpace.material.paletteRow = PALETTE_ROW.DUSTY_PURPLE
      infoBox.add(headSpace)

      const infoBox2 = getAssetsManager().fetchMeshDeepClone(
        'uiSmall',
        'info-box',
        true
      )
      infoBox2.matrix.setConstraints(
        new Pin(0, 0, 50, 50),
        new Pin(0, 0.5),
        new Pin(0, 0.5, 50)
      )
      infoBox.add(infoBox2)

      const name = new UITextMesh(player.name, { ...cardName, align: 'left' })
      infoBox.add(name)

      playerContainer.add(infoBox)

      safe.listenToProperty(player, 'avatar', avatar => {
        if (avatar) {
          const head = getAssetsManager().fetchMeshDeepClone(
            'uiSmall',
            'feedback-2',
            true
          )
          head.material.paletteRow = 2
          head.matrix.setConstraints(
            new Pin(1, 1),
            new Pin(0, 0),
            new Pin(0, 0.5, 18)
          )
          head.matrix.prescale.setScalar(2)
          infoBox.add(head)
          const cardMeta = CardLibrary.get(avatar.base)!
          getAssetsManager()
            .load(
              'texture',
              `game/cards/art-full/units/${cardMeta.artSlug}.png`
            )
            .then(heroTexture => {
              safelyResetFlipY(heroTexture)
              heroTexture.wrapS = ClampToEdgeWrapping
              heroTexture.wrapT = ClampToEdgeWrapping

              const avatarMesh = new RectangleMesh(
                new RectangleMaterial({
                  map: heroTexture,
                  forceTransparent: true
                }),
                0.5
              )
              avatarMesh.matrix.setConstraints(
                new Pin(1, 2),
                ReadonlyPin.Top,
                ReadonlyPin.Top.cloneOffset(0, -1)
              )
              infoBox2.add(avatarMesh)
            })
        }
      })

      infoBoxes.set(player, infoBox)

      const helper = new Matrix2DUI()

      if (state.players.length === 4) {
        safe.listenToProperty(
          state,
          'uiPlayerActivityBarExpanded',
          expanded => {
            const arrowDR = getArrow('dr')
            helper.setConstraints(
              new Pin(
                0.5 - horMarginPercent,
                0,
                -playerBarWidth - d,
                expanded ? cornerHeight : 0
              ),
              ReadonlyPin.TopLeft,
              new Pin(
                horMarginPercent,
                0.5,
                playerBarWidth * 0.5,
                expanded ? playerBarHeight * 0.5 + 2 : 0
              )
            )
            attemptMoveMatrix(arrowDR.matrix, helper)

            const arrowLD = getArrow('ld')
            helper.setConstraints(
              new Pin(0.5 - horMarginPercent, 0, -playerBarWidth, cornerHeight),
              ReadonlyPin.BottomLeft,
              new Pin(
                horMarginPercent,
                0.5,
                playerBarWidth * 0.5,
                -playerBarHeight * 0.5 - 2
              )
            )
            attemptMoveMatrix(arrowLD.matrix, helper)

            const arrowRU = getArrow('ru')
            helper.setConstraints(
              new Pin(
                0.5 - horMarginPercent,
                0,
                -playerBarWidth,
                expanded ? cornerHeight : 0
              ),
              ReadonlyPin.TopRight,
              new Pin(
                1 - horMarginPercent,
                0.5,
                -playerBarWidth * 0.5,
                expanded ? playerBarHeight * 0.5 + 2 : 0
              )
            )
            attemptMoveMatrix(arrowRU.matrix, helper)

            const arrowUL = getArrow('ul')
            helper.setConstraints(
              new Pin(0.5 - horMarginPercent, 0, -playerBarWidth, cornerHeight),
              ReadonlyPin.BottomRight,
              new Pin(
                1 - horMarginPercent,
                0.5,
                -playerBarWidth * 0.5,
                -playerBarHeight * 0.5 - 2
              )
            )
            attemptMoveMatrix(arrowUL.matrix, helper)
          }
        )
      }
    })
  }
}
