import { ReadonlyPin } from '~/helpers/LayoutHelpers'
import { cardCarousel } from '~/tests/cardCarousel'
import { AnimatedBool } from '~/utils/AnimatedBool'
import { findAndAffectCardArtMaterial } from '~/utils/findAndAffectCardArtMaterial'
import { globalAccess } from '~/utils/globalAccess'
import { makeQuickButtonColumn, QuickButtonData } from '~/utils/quickButton'

async function testColorMatrixStackScene() {
  const cards = await cardCarousel()
  const uiContainer = globalAccess.ui?.getContainer('randomTests')
  if (uiContainer) {
    await uiContainer.ready

    function t(key: string) {
      for (const ce of cards.cardsEntities) {
        findAndAffectCardArtMaterial(ce.get('mesh'), mat => {
          //@ts-ignore
          const cma = mat.colorMatrixStackFg[key].animator as AnimatedBool
          cma.value = !cma.value
        })
      }
    }
    const matrixNames = [
      // 'grayscale1',
      // 'invertValue',
      // 'invertHue',
      'heal',
      'frozen',
      'withered',
      'stealthChange',
      'damage'
      // 'grayscale2'
    ]
    makeQuickButtonColumn(
      uiContainer,
      matrixNames.map(
        matrixName =>
          new QuickButtonData(matrixName, () => {
            t(matrixName)
          })
      ),
      ReadonlyPin.BottomRight,
      ReadonlyPin.BottomRight
    )
    uiContainer.show()
  }
}

export const test = testColorMatrixStackScene
