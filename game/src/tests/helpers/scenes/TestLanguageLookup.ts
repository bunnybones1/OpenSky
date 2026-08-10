import { i18nInitNewInstance } from '@opensky/language-manager'
import { CardLibrary } from '@skyweaver/state-metadata'

import { getAssetsManager } from '~/assets'
import { PALETTE_ROW } from '~/constants'
import env from '~/env'
import { abort } from '~/helpers/abortError'
import { Pin, ReadonlyPin } from '~/helpers/LayoutHelpers'
import PaletteMappedVertexColorMeshMaterial from '~/materials/PaletteMappedVertexColorMeshMaterial'
import { UI } from '~/scenes/ui'
import { createButtonText } from '~/utils/ui'

import { BaseTestScene } from './BaseTestScene'

class TestLanguageLookup extends BaseTestScene {
  testMaterial: PaletteMappedVertexColorMeshMaterial
  async initUI(ui: UI) {
    await getAssetsManager().loadAsset('uiSmall')

    const container = ui.getContainer('randomTests')
    await container.ready

    const button = getAssetsManager().fetchMeshDeepClone(
      'uiSmall',
      'info-box-with-margin',
      undefined,
      true
    )
    button.material.paletteRow = PALETTE_ROW.PURPLE
    container.add(button)

    button.matrix.setConstraints(
      new Pin(0.3, 0.2, -4, -4),
      ReadonlyPin.Center,
      ReadonlyPin.Center
    )

    const englishT = await i18nInitNewInstance({
      defaultNS: 'game',
      lng: 'en',
      version: env.GITCOMMIT,
      parseMissingKeyHandler: key => {
        abort(`missing lang data for key ${key} `)
        return ''
      }
    })
    const pigLatinT = await i18nInitNewInstance({
      defaultNS: 'game',
      lng: 'pig',
      version: env.GITCOMMIT,
      parseMissingKeyHandler: key => {
        abort(`missing lang data for key ${key} `)
        return ''
      }
    })

    createButtonText(
      button,
      `${englishT('cards:40.name')}
      ${pigLatinT('cards:40.name')}
      Cost: ${CardLibrary.get('40')!.cost}`,
      undefined,
      undefined,
      undefined,
      undefined
    )

    container.show()
    super.initUI(ui)
  }

  update(dt: number) {
    super.update(dt)
  }
}
export const scene = TestLanguageLookup
