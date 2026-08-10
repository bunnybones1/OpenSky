import { i18n, TFuncKey } from '@opensky/language-manager'
import { Color, Texture, Vector2, WebGLRenderer } from 'three'

import { getAssetsManager } from '~/assets'
import { TextureType } from '~/assets/TextureType'
import { BUTTON_HEIGHT, PALETTE_ROW } from '~/constants'
import { Pin, ReadonlyPin } from '~/helpers/LayoutHelpers'
import RectangleMaterial from '~/materials/RectangleMaterial'
import Mesh2D from '~/meshes/Mesh2D'
import Object2D from '~/meshes/Object2D'
import RectangleMesh from '~/meshes/RectangleMesh'
import { Easing } from '~/systems/animation/Easing'
import { simpleTweener } from '~/systems/animation/tweeners'
import * as textOptions from '~/systems/text/TextOptions'
import UITextMesh from '~/systems/text/UITextMesh'
import {
  createButton,
  createButtonIcon,
  createButtonText,
  createOverlay
} from '~/utils/ui'

import { UI } from '..'
import UIContainer from '../components/UIContainer'
import { goBackToWebapp } from '../helpers'

export default class TutorialTitleContainer extends UIContainer {
  radialGradientTexture: Texture
  tutorialTitle: string | { translate: TFuncKey } | null = null
  tutorialDescription: string | { translate: TFuncKey } | null = null

  constructor(ui: UI, priority: number) {
    super(ui, 'tutorialTitle', {
      priority
    })
  }

  async fadeIn(duration = 1000) {
    super.fadeIn(duration)
    const lineGap = 10

    const radialGradient = new RectangleMesh(
      new RectangleMaterial({
        map: this.radialGradientTexture,
        forceTransparent: true
      })
    )
    radialGradient.matrix.setConstraints(
      new Pin(0, 0, 500, 500),
      ReadonlyPin.Center,
      ReadonlyPin.Center
    )
    this.add(radialGradient)
    const overlay = createOverlay(this, undefined, undefined, -0.945)
    overlay.matrix.setColor(new Color(0x150f24), 0.8)

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
      i18n.t('common:options.back'),
      undefined,
      undefined,
      ReadonlyPin.Center.cloneOffset(12, 0)
    )
    radialGradient.matrix.opacity = 0

    await Promise.all([
      simpleTweener.to({
        description: 'fade in radial gradient',
        target: radialGradient.matrix,
        propertyGoals: {
          opacity: 0.99
        },
        duration: 400,
        easing: Easing.Quartic.Out
      }).finished
    ])

    const headingContainerSizePin = Pin.fromPixels(640 * 1.4, 0)
    const headingContainer = new Object2D()
    headingContainer.matrix.setConstraints(
      headingContainerSizePin,
      ReadonlyPin.Center,
      ReadonlyPin.Center,
      new Vector2(1.55, 1.55)
    )

    const title =
      typeof this.tutorialTitle === 'string'
        ? this.tutorialTitle
        : this.tutorialTitle
        ? (i18n.t(this.tutorialTitle.translate) as string)
        : ''

    const description =
      typeof this.tutorialDescription === 'string'
        ? this.tutorialDescription
        : this.tutorialDescription
        ? (i18n.t(this.tutorialDescription.translate) as string)
        : ''

    document.title = `OpenSky | ${title} ${description}`

    const headingText = new UITextMesh(title, textOptions.splashTitle)
    headingText.matrix.setConstraintsPosition(
      ReadonlyPin.Center.cloneOffset(0, -4)
    )
    headingContainer.add(headingText)

    headingText.onBeforeRender = (renderer: WebGLRenderer) => {
      const pixelRatio = renderer.getPixelRatio()
      const viewportWidth = renderer.domElement.width / pixelRatio
      const viewportHeight = renderer.domElement.height / pixelRatio

      const height = headingContainerSizePin.y.offset

      renderer.setScissor(
        0,
        viewportHeight / 2 - height / 2,
        viewportWidth,
        height
      )

      renderer.setScissorTest(true)
    }

    headingText.onAfterRender = (renderer: WebGLRenderer) => {
      renderer.setScissorTest(false)
    }

    const lineTop = getAssetsManager().fetchMeshDeepClone(
      'uiSmall',
      'line',
      true,
      true
    ) as Mesh2D
    lineTop.frustumCulled = false
    ;(lineTop.material as any).transparent = true
    lineTop.matrix.setConstraints(
      new Pin(0.5, 0, 0, 0.8),
      ReadonlyPin.Top,
      ReadonlyPin.Top.cloneOffset(0, -lineGap),
      new Vector2(13, 1)
    )
    lineTop.matrix.setColor(new Color(0xac8fff))

    const lineBottom = getAssetsManager().fetchMeshDeepClone(
      'uiSmall',
      'line',
      true,
      true
    ) as Mesh2D
    lineBottom.frustumCulled = false
    ;(lineBottom.material as any).transparent = true
    lineBottom.matrix.setConstraints(
      new Pin(0.5, 0, 0, 0.5),
      ReadonlyPin.Bottom,
      ReadonlyPin.Bottom.cloneOffset(0, lineGap),
      new Vector2(13, 1)
    )
    lineBottom.matrix.setColor(new Color(0xac8fff))

    headingContainer.add(lineTop)
    headingContainer.add(lineBottom)

    const descriptionText = new UITextMesh(description, {
      ...textOptions.splashDescription,
      // size: 22,
      width: 520
    })
    descriptionText.matrix.setConstraintsPosition(
      ReadonlyPin.Bottom.cloneOffset(0, 12 + lineGap)
    )
    headingContainer.add(descriptionText)

    this.add(headingContainer)

    await simpleTweener.to({
      description: 'fade in start button',
      target: headingContainerSizePin.y,
      propertyGoals: {
        offset: 64
      },
      duration: 1000,
      easing: Easing.Quartic.InOut
    }).finished

    const playButtonContainer = this.ui.getContainer('tutorialPlayButton')
    await playButtonContainer.ready
    await getAssetsManager().allPending()
    await playButtonContainer.fadeIn()
    await playButtonContainer.play

    await Promise.all([this.fadeOut(1000), playButtonContainer.fadeOut()])

    const texCache = getAssetsManager().getTextureCache(TextureType.Default)

    const url = texCache.lookupTextureUrl(this.radialGradientTexture)
    if (url) {
      texCache.disposeTexture(url)
    }
  }

  protected async init() {
    this.radialGradientTexture = await getAssetsManager().load(
      'texture',
      `game/tutorial/radial-gradient.png`
    )
  }
}
