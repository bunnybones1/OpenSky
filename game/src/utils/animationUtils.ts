import { NumberEaser } from '~/systems/animation/RawTweener'

import { AnimatedBool, ProgressCallback } from './AnimatedBool'

export function simple01Animation(
  onProgress: ProgressCallback,
  duration = 1000,
  easing?: NumberEaser
) {
  const anim = new AnimatedBool(onProgress, false, duration, easing)
  anim.value = true
}
