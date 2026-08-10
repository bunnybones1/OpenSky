import { BATTERY_SAVINGS_MODE } from '@opensky/shared/device'
import { MAX_FRAMERATE } from '@opensky/shared/gameConstants'
import { clamp } from '@opensky/shared/utils/math'

import { defaultTargetFps } from '~/renderSettings'

class FrameRateTracker {
  currentFps = 30
  targetFps = 60
  averageFps = 30
  currentDeltaTime = 0
  private timeOfLastTest = 0
  private timeOfLastRender = 0
  private fpsSamples: number[] = []
  private totalSamples = 10
  private sampleIndex = 0
  private accumulatedTime = 0
  constructor() {
    for (let i = 0; i < this.totalSamples; i++) {
      this.fpsSamples[i] = 60
    }
  }

  updateShouldRender(durationOverride?: number) {
    const now = performance.now() * 0.001
    const originalDt = now - this.timeOfLastTest
    this.timeOfLastTest = now
    this.accumulatedTime += originalDt

    if (durationOverride !== undefined) {
      this.currentDeltaTime = durationOverride
      return true
    }
    if (
      this.targetFps >= MAX_FRAMERATE ||
      this.accumulatedTime > 0.95 / this.targetFps
    ) {
      this.accumulatedTime = 0

      this.currentDeltaTime = Math.min(now - this.timeOfLastRender, 0.2)
      // console.log('cdt ' + this.currentDeltaTime)
      this.timeOfLastRender = now
      this.currentFps = 1 / this.currentDeltaTime

      this.sampleIndex = (this.sampleIndex + 1) % this.totalSamples
      this.fpsSamples[this.sampleIndex] = this.currentFps
      let averageFps = 0
      for (const sample of this.fpsSamples) {
        averageFps += sample
      }
      averageFps /= this.totalSamples
      this.averageFps = averageFps
      return true
    } else {
      return false
    }
  }

  setFPS(fps: number = defaultTargetFps.value) {
    this.targetFps = clamp(fps, 1, BATTERY_SAVINGS_MODE ? 5 : MAX_FRAMERATE)
  }
}

export const masterFrameRateTracker = new FrameRateTracker()

defaultTargetFps.listen(v => {
  masterFrameRateTracker.setFPS(v)
})
