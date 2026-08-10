import { getNext } from '@opensky/shared/utils/arrayUtils'
import { lerp } from '@opensky/shared/utils/math'

import { getAssetsManager } from '~/assets'
import { Pin, ReadonlyPin } from '~/helpers/LayoutHelpers'
import Object2D from '~/meshes/Object2D'
import { UI } from '~/scenes/ui'
import ProgressionLine from '~/scenes/ui/components/ProgressionLine'
import { TickIndicator } from '~/scenes/ui/components/ProgressionTick'
import UpdateManager from '~/systems/UpdateManager'
import { animationDelay } from '~/utils/asyncUtils'
import { makeQuickButtonColumn, QuickButtonData } from '~/utils/quickButton'
import { removeFromParent } from '~/utils/threeUtils'

import { BaseTestScene } from './BaseTestScene'

class TestProgressLineScene extends BaseTestScene {
  async initUI(ui: UI) {
    await getAssetsManager().loadAsset('uiSmall')
    await getAssetsManager().loadAsset('particle')

    const container = ui.getContainer('randomTests')
    await container.ready

    const totalBars = 4

    const resizingSize = new Pin(0, 1, 500, 0)
    const staticContainer = new Object2D()
    container.add(staticContainer)
    staticContainer.matrix.size = new Pin(0, 1, 400, 0)
    const resizingContainer = new Object2D()
    resizingContainer.matrix.size = resizingSize
    container.add(resizingContainer)
    UpdateManager.register({
      update() {
        resizingSize.x.offset = lerp(
          300,
          500,
          Math.cos(performance.now() * 0.003) * 0.5 + 0.5
        )
      }
    })

    const bars: ProgressionLine[] = []
    let initProgress = 1 / 3
    const tickData = [
      TickIndicator.CHECK_BLUE,
      TickIndicator.CHECK_BLUE,
      // TickIndicator.NONE,
      // TickIndicator.NONE,
      // TickIndicator.NONE,
      // TickIndicator.NONE,
      TickIndicator.NONE
    ]
    function buildBars() {
      for (let i = 1; i <= totalBars; i++) {
        const bar = new ProgressionLine({
          ticks: tickData,
          initProgress,
          tickRadius: 25 - i * 3,
          tickThickness: i
        })

        // bar.progress = 0.5

        ;(i <= totalBars * 0.5 ? resizingContainer : staticContainer).add(
          bar.mesh
        )
        bar.mesh.matrix.setConstraints(
          new Pin(1, 0, 0, i),
          ReadonlyPin.Center,
          new Pin(0.5, i / (totalBars + 1))
        )
        bars.push(bar)
      }
      return bars
    }
    buildBars()

    function getBars() {
      if (bars.length > 0) {
        return bars
      } else {
        return buildBars()
      }
    }

    function rebuildBars() {
      if (bars) {
        for (const bar of bars) {
          removeFromParent(bar.mesh)
        }
      }
      buildBars()
    }

    await container.ready
    await getAssetsManager().loadAsset('uiSmall')
    const testIndicators = [
      TickIndicator.CURRENT,
      TickIndicator.X,
      TickIndicator.CHECK_BLUE,
      TickIndicator.CHECK_LILAC
    ]
    let testIndicator = testIndicators[0]

    async function simulateMatchEndWin() {
      initProgress = 1 / (tickData.length - 1)
      rebuildBars()
      await animationDelay(1000)
      const bars = getBars()
      for (let i = 0; i <= bars.length; i++) {
        bars[i].setCurrentTickIndicator(TickIndicator.CHECK_BLUE)
        bars[i].progressWholeTickForward(animDuration)
      }
    }
    async function simulateMatchEndLoss() {
      initProgress = 1 / (tickData.length - 1)
      rebuildBars()
      await animationDelay(1000)
      const bars = getBars()
      for (let i = 0; i <= bars.length; i++) {
        bars[i].setCurrentTickIndicator(TickIndicator.X)
      }
    }
    const animDuration = 300
    makeQuickButtonColumn(
      container,
      [
        new QuickButtonData('total+', () => {
          tickData.push(TickIndicator.NONE)
          rebuildBars()
        }),
        new QuickButtonData('total-', () => {
          if (tickData.length > 2) {
            tickData.pop()
          }
          rebuildBars()
        }),
        new QuickButtonData('+1 progress', () => {
          initProgress += 1 / (tickData.length - 1)
          const bars = getBars()
          console.log(bars)
          for (let i = 0; i < bars.length; i++) {
            bars[i].progressWholeTickForward(animDuration)
          }
        }),
        new QuickButtonData('-1 progress', () => {
          initProgress -= 1 / (tickData.length - 1)
          const bars = getBars()
          for (let i = 0; i < bars.length; i++) {
            bars[i].progressWholeTickBack(animDuration)
          }
        }),
        new QuickButtonData('+0.1 progress', () => {
          initProgress += 0.1
          const bars = getBars()
          for (let i = 0; i < bars.length; i++) {
            bars[i].progressTickPercent(0.1, animDuration)
          }
        }),
        new QuickButtonData('-0.1 progress', () => {
          initProgress -= 0.1
          const bars = getBars()
          for (let i = 0; i < bars.length; i++) {
            bars[i].progressTickPercent(-0.1, animDuration)
          }
        }),
        new QuickButtonData('change current', () => {
          testIndicator = getNext(testIndicators, testIndicator)
          const bars = getBars()
          for (let i = 0; i < bars.length; i++) {
            bars[i].setCurrentTickIndicator(testIndicator)
          }
        }),
        new QuickButtonData('sim win', () => {
          simulateMatchEndWin()
        }),
        new QuickButtonData('sim loss', () => {
          simulateMatchEndLoss()
        }),
        new QuickButtonData('hide', () => {
          container.fadeOut()
        })
      ],
      ReadonlyPin.BottomRight
    )
    container.fadeIn()
    super.initUI(ui)
  }
}

export const scene = TestProgressLineScene
