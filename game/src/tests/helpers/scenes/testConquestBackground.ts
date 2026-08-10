import { getAssetsManager } from '~/assets'
import BasicIslandTest from '~/tests/BasicIslandTest'
import { globalAccess } from '~/utils/globalAccess'

async function testConquestBackground() {
  const islandTest = new BasicIslandTest()
  await islandTest.init()
  await getAssetsManager().loadAsset('uiSmall')

  const bgContainer = globalAccess.ui!.getContainer('conquestConclusionCover')
  await bgContainer.ready
  await bgContainer.fadeIn()
  // super.initUI(ui)
}

export const test = testConquestBackground
