import { delayPromise } from '@opensky/shared/utils/async'
import { clamp } from 'lodash-es'
import { MutableRefObject } from 'react'

import { captureError } from '../../sentry'
import {
  FlareColor,
  makeMagicExplosionFlare
} from './make-magic-explosion-flare/make-magic-explosion-flare'
import { makeMagicExplosionParticles } from './make-magic-explosion-particles/make-magic-explosion-particles'

interface MagicExplosionOptions {
  isFlareEnabled?: boolean
  flareColor?: FlareColor
  flareOpacity?: string
  delay?: number
  width?: string
  height?: string
  left?: string
  top?: string
}

export const triggerMagicExplosion = async (
  ref: MutableRefObject<HTMLDivElement | null>,
  options?: MagicExplosionOptions
) => {
  try {
    if (!ref.current) return

    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 256

    const s = canvas.style
    s.position = 'absolute'
    s.width = options?.width || '150%'
    s.height = options?.height || '130%'
    s.left = options?.left || '-25%'
    s.top = options?.top || '-15%'
    s.zIndex = '5000'
    s.pointerEvents = 'none'

    const gl = canvas.getContext('webgl', {
      alpha: true,
      premultipliedAlpha: false
    })

    if (gl) {
      // Step 2: Get the particle and flare renderers.
      const flare = !!options?.isFlareEnabled
        ? makeMagicExplosionFlare(
            gl,
            options.flareColor || 'cyan',
            options.flareOpacity
          )
        : undefined
      const particles = makeMagicExplosionParticles(gl)

      gl.enable(gl.BLEND)
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE)

      const timeArr = [0, 0, 0]

      await delayPromise(150 + (options?.delay || 0))

      ref.current.append(canvas)

      const startTime = performance.now()

      const uniqueTimeOffset = Math.random() * 50

      const endTime = 0.75

      const raf = () => {
        const t = (performance.now() - startTime) * 0.0002

        if (t >= endTime) {
          gl.clearColor(1, 1, 1, 0)
          gl.enable(gl.DEPTH_TEST)
          gl.clear(gl.COLOR_BUFFER_BIT)
          canvas.remove()
          return
        }

        const flareTime = t / endTime
        const flareTimeEased = 1 - Math.pow(1 - flareTime, 2)
        const invFlareTime = 1 - flareTimeEased
        timeArr[0] = Math.sin((1 - invFlareTime * invFlareTime) * Math.PI) * 0.75
        timeArr[1] = uniqueTimeOffset + t * 4
        timeArr[2] = clamp(t % 10000, 0, 1)

        if (flare) {
          flare.render(timeArr)
        }
        if (particles) {
          particles.render(timeArr)
        }
        requestAnimationFrame(raf)
      }
      requestAnimationFrame(raf)
    }
  } catch (error) {
    captureError(error, 'Magic explosion error', false, true)
  }
}
