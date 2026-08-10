import { getAssetsManager } from '~/assets'
import EaseHelper from '~/helpers/EaseHelper'
import { ReadonlyPin } from '~/helpers/LayoutHelpers'
import { UI } from '~/scenes/ui'
import { Ease, Easing } from '~/systems/animation/Easing'

import { BaseTestScene } from './BaseTestScene'

class TestEaseScene extends BaseTestScene {
  constructor() {
    super()
  }
  async init() {
    //
  }

  async initUI(ui: UI) {
    await getAssetsManager().loadAsset('uiSmall')

    const container = ui.getContainer('randomTests')
    await container.ready

    const eases: Ease[] = [
      v => v,
      // v => Easing.Quartic.Out(Math.sin(v * Math.PI)),
      // Easing.Custom.GlitchyPulseLoop,
      // v => Math.sin(v * 30),
      // v => Math.sin(v * Math.PI),
      // nestEases([Easing.Sinusoidal.InOut]),
      // Easing.Custom.FadeInOut,
      // Easing.Custom.FadeInOut2
      // Easing.Custom.FlatTopHalfSin
      // Easing.Custom.SummonTiming,
      // Easing.Custom.RoundedOutHard,
      // Easing.Custom.RoundedOut,
      // Easing.Quartic.InOut,
      // Easing.Custom.SummonTiming,

      // Easing.Linear,
      // Easing.Cubic.Out,
      // v => {
      //   return lerp(v, Easing.Cubic.Out(v), Math.pow(v, 3))
      // },
      // v => {
      //   return lerp(lerp(v, Easing.Cubic.Out(v), Math.pow(v, 6)), v, 0.3)
      // },
      // Easing.Custom.RopeTimerProgress,
      // Easing.Custom.AvoidEdges,
      // Easing.Custom.SuperFastOut,
      // Easing.Circular.Out
      // makeDilutedEase(makeEaseOutIn(Easing.Quadratic.InOut), 0.75),
      Easing.Custom.WheelSpin
      // makeEaseOutIn(Easing.Quadratic.InOut),
      // makeRelativeTimelineRemap(5, 20, 15),
      // nestEases([makeRelativeTimelineRemap(5, 20, 15), Easing.Quadratic.InOut]),
      // makeRelativeTimelineRemap(10, 20, 10),
      // nestEases([
      //   makeRelativeTimelineRemap(10, 20, 10),
      //   Easing.Quadratic.InOut
      // ]),
      // makeRelativeTimelineRemap(15, 20, 5),
      // nestEases([makeRelativeTimelineRemap(15, 20, 5), Easing.Quadratic.InOut]),
      // Easing.Custom.GlitchyPulseLoop
    ]

    const e = new EaseHelper(eases)

    container.add(e)

    e.matrix.setConstraints(
      ReadonlyPin.FullSize.cloneOffset(-20, -120),
      ReadonlyPin.TopLeft,
      ReadonlyPin.TopLeft.cloneOffset(10, 110)
    )
    // buttonColumn.visuals.children.forEach(child => container.add(child))
    container.show()
    super.initUI(ui)
  }
}
export const scene = TestEaseScene
