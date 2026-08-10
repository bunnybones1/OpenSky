import { i18n } from '@opensky/language-manager'
import { Color } from 'three'

import { getAssetsManager } from '~/assets/index'
import { HEADING_GLOW_COLORS } from '~/colors/colorLibrary'
import { gameMode } from '~/helpers/envGameModeHelpers'
import { ReadonlyPin, SizePin } from '~/helpers/LayoutHelpers'
import Mesh2D from '~/meshes/Mesh2D'
import Object2D from '~/meshes/Object2D'
import * as textOptions from '~/systems/text/TextOptions'
import UITextMesh from '~/systems/text/UITextMesh'
import { AnimatedBool } from '~/utils/AnimatedBool'
import { animationDelay } from '~/utils/asyncUtils'

export default class MatchEndHeaderInfo extends Object2D {
  private _headingText: UITextMesh
  private _headingGlow: Mesh2D
  private _headingOpacityController: AnimatedBool
  private lastAnnouncement: Promise<void> | undefined
  constructor(name: string) {
    super()
    const usernameText = new UITextMesh(name, textOptions.matchEndUserName)
    usernameText.matrix.setConstraintsPosition(
      ReadonlyPin.Top.cloneOffset(0, -18)
    )
    let modeText = i18n.t(`ui.gameModeTitles.${gameMode}`)

    const modeSubtext = i18n.t(`ui.gameModeSubtext.${gameMode}`)
    if (!gameMode.includes('CONQUEST') && modeSubtext.length > 0) {
      modeText += ` (${modeSubtext})`
    }

    const gameModeText = new UITextMesh(modeText, {
      ...textOptions.matchEndUserName,
      size: 18
    })
    gameModeText.matrix.setConstraintsPosition(
      ReadonlyPin.Top.cloneOffset(0, 76)
    )

    const heading = new Object2D()

    const headingGlow = getAssetsManager().fetchMeshDeepClone(
      'uiSmall',
      'glow-lines'
    )
    headingGlow.matrix.setConstraints(
      new SizePin(1, 0.5, 10, 'y'),
      ReadonlyPin.Center,
      ReadonlyPin.Center
    )
    headingGlow.matrix.opacity = 0.65

    const headingText = new UITextMesh('HEADING', {
      ...textOptions.buttonText,
      color: new Color(0xffffff),
      size: 48,
      align: 'center'
    })
    headingText.matrix.setConstraintsPosition(
      ReadonlyPin.Center.cloneOffset(0, -2)
    )
    heading.add(headingGlow)
    heading.add(headingText)
    this.add(usernameText)
    this.add(gameModeText)
    this.add(heading)
    const headingOpacityController = new AnimatedBool(
      v => {
        heading.matrix.opacity = v
      },
      false,
      200
    )

    this._headingText = headingText
    this._headingGlow = headingGlow
    this._headingOpacityController = headingOpacityController
  }
  async announce(...args: Parameters<MatchEndHeaderInfo['_announceInternal']>) {
    this.lastAnnouncement = this._announceInternal.call(this, ...args)
    await this.lastAnnouncement
    this.lastAnnouncement = undefined
  }
  private async _announceInternal(
    text: string,
    glowType: keyof typeof HEADING_GLOW_COLORS,
    duration: number = 2000
  ) {
    await this._headingOpacityController.animateValue(false)
    this._headingText.text = text
    this._headingGlow.matrix.setColor(HEADING_GLOW_COLORS[glowType])
    await this._headingOpacityController.animateValue(true)
    await animationDelay(duration)
  }
}
