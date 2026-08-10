import { Account, GameMode } from '@opensky/proto'
import {
  changeUrlAndReload,
  queryStringUrlReplacement
} from '@opensky/shared/utils/location'

import apiClient from '~/apiClient'
import { getAssetsManager } from '~/assets'
import { TextureType } from '~/assets/TextureType'
import { BUTTON_HEIGHT, BUTTON_MARGINS, PALETTE_ROW } from '~/constants'
import { getFireHighlightOptionOverrides } from '~/helpers/fireHighlightMaterialFactory'
import { Pin, ReadonlyPin, SizePin } from '~/helpers/LayoutHelpers'
import { makeUnscalingContainer } from '~/helpers/makeUnscalingContainer'
import MagicFireHighlightMeshMaterial from '~/materials/MagicFireHighlightMeshMaterial'
import Mesh2D from '~/meshes/Mesh2D'
import Object2D from '~/meshes/Object2D'
import queryParams from '~/queryParams'
import { firstState, store } from '~/state'
import { fontFaces } from '~/systems/text/FontFace'
import * as textOptions from '~/systems/text/TextOptions'
import UITextMesh from '~/systems/text/UITextMesh'
import { createButton, createButtonIcon, createButtonText } from '~/utils/ui'

import { UI } from '..'
import PinnedButton from '../components/PinnedButton'
import {
  createSkyTag,
  SKYTAG_ASPECT_RATIO,
  SkyTagDirection
} from '../components/SkyTag'
import UIContainer from '../components/UIContainer'
import { goBackToWebapp } from '../helpers'
import { removeLoadingSpinner } from '../removeLoadingSpinner'

const textWithoutDots = 'Waiting for a game to start'

export default class WaitingForMatchContainer extends UIContainer {
  private dots: number = 0
  private text: UITextMesh
  private oldMatch?: {
    id: number
    player: number
    mode: GameMode
    replayID: string
  }
  private replayButton: PinnedButton
  private account?: Account
  private skyTagContainer: Object2D
  constructor(ui: UI, priority: number) {
    super(ui, 'waiting-for-match', { priority })
  }
  protected async init() {
    await getAssetsManager().loadAsset('gamePiecesGraphical')
    if (!queryParams.spectateCode) {
      throw new Error(
        "Can't open waiting for match UI when not in spectate mode"
      )
    }
    const unscalingFogBGContainer = makeUnscalingContainer('uiHeight', 1000)

    this.add(unscalingFogBGContainer)

    const fogProto = getAssetsManager().fetchMeshDeepClone(
      'uiSmall',
      'rectangle-highlight-from-bottom'
    ) as Mesh2D
    const fogMat = new MagicFireHighlightMeshMaterial(
      getAssetsManager(),
      getFireHighlightOptionOverrides('fog')
    )
    const fog = new Mesh2D(fogProto.geometry, fogMat)
    unscalingFogBGContainer.add(fog)

    const unscalingContainer = makeUnscalingContainer('uiWidth', 660)
    this.skyTagContainer = unscalingContainer
    this.add(unscalingContainer)

    const address = queryParams.spectateCode.split('.')[0]
    apiClient
      .getAccount({ address })
      .then(({ account }) => {
        this.account = account
        this.generateSkyTag()
      })
      .catch(e => store.fireClientError(e))
    removeLoadingSpinner()

    const text = new UITextMesh(textWithoutDots, {
      ...textOptions.generic,
      size: 24,
      vAlign: 'top'
    })
    text.matrix.setConstraints(undefined, ReadonlyPin.Top, new Pin(0.5, 0.6))
    this.text = text
    this.add(text)
    firstState.then(() => this.fadeOut())
    const replayButton = createButton(this, () => {
      if (!this.oldMatch) {
        return
      }
      replayButton.disabled = true
      changeUrlAndReload(
        queryStringUrlReplacement(location.href, {
          mode: 'REPLAY',
          serializedGamePlayer: `${this.oldMatch.player}`,
          replayMatchID: `${this.oldMatch.id}`,
          replayID: `${this.oldMatch.replayID}`
        })
      )
    })
    replayButton.basePaletteRow = PALETTE_ROW.GREEN
    replayButton.mesh.matrix.setConstraints(
      Pin.fromPixels(BUTTON_HEIGHT * 6 + BUTTON_MARGINS, BUTTON_HEIGHT),
      ReadonlyPin.Bottom,
      new Pin(0.5, 0.4)
    )
    createButtonText(replayButton.mesh, '⚅ Watch Last Match Replay', {
      ...textOptions.optionsButtonText,
      fontFace: fontFaces.BarlowBold
    })
    this.replayButton = replayButton

    replayButton.mesh.shouldRenderAsGroup = true
    text.shouldRenderAsGroup = true

    const backButton = createButton(
      this,
      () => {
        backButton.disabled = true
        this.fadeOut(1000)
        goBackToWebapp()
      },
      Pin.fromPixels(BUTTON_HEIGHT * 2, BUTTON_HEIGHT),
      ReadonlyPin.TopLeft,
      ReadonlyPin.TopLeft.cloneOffset(16, 16)
    )
    backButton.basePaletteRow = PALETTE_ROW.PURPLE
    createButtonIcon(
      backButton.mesh,
      'ui-icon-back',
      ReadonlyPin.Left.cloneOffset(18, 0)
    )
    createButtonText(
      backButton.mesh,
      'BACK',
      undefined,
      undefined,
      ReadonlyPin.Center.cloneOffset(12, 0)
    )
  }

  private generateSkyTag() {
    if (!this.account) {
      return
    }
    const tag = createSkyTag(
      this.account,
      this.oldMatch?.mode ?? GameMode.RANKED_CONSTRUCTED,
      SkyTagDirection.Left,
      0,
      TextureType.Default
    )
    tag.matrix.setConstraints(new SizePin(0.46, 1, SKYTAG_ASPECT_RATIO, 'x'))
    this.skyTagContainer.add(tag)
  }
  markReconnectAttempt(
    oldMatch?: {
      id: number
      player: number
      mode: GameMode.RANKED_CONSTRUCTED | GameMode.RANKED_DISCOVERY
      replayID: string
    },
    error?: 'invalid_code'
  ) {
    this.dots += 1
    this.dots %= 5
    this.text.text = `${textWithoutDots}${'.'.repeat(this.dots + 1)}`
    const regenSkyTag = this.account && this.oldMatch?.mode !== oldMatch?.mode

    this.oldMatch = oldMatch
    this.replayButton.mesh.visible = !!oldMatch
    if (regenSkyTag) {
      this.generateSkyTag()
    }
    if (error === 'invalid_code') {
      this.text.text = `Your spectate code is expired.\nAsk ${
        this.account?.name ?? ''
      } for a new one.`
      super.fadeIn()
    }
  }
  show() {
    if (store.state) {
      return
    }
    super.show()
  }
  fadeIn(duration?: number): Promise<void> {
    if (store.state) {
      return Promise.resolve()
    }
    return super.fadeIn(duration)
  }
}
