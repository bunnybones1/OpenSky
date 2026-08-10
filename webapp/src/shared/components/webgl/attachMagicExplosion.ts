import { delayPromise } from '@opensky/shared/utils/async'
import { clamp } from '@opensky/shared/utils/math'

import { makeWebGLFlare } from './makeWebGLFlare'
import { makeWebGLParticles } from './makeWebGLParticles'

// TODO: Turn this into a helper that can be called to show an explosion on any element

export async function attachMagicExplosion(
  containerRef: any,
  explosionEffectDelay = 0,
  useFlare = false
) {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256

  const s = canvas.style
  s.position = 'absolute'
  s.width = '150%'
  s.height = '130%'
  s.left = '-25%'
  s.top = '-15%'
  s.zIndex = '5000'

  const gl = canvas.getContext('webgl', {
    alpha: true,
    // antialias?: boolean;
    // depth?: boolean;
    // desynchronized?: boolean;
    // failIfMajorPerformanceCaveat?: boolean;
    // powerPreference?: WebGLPowerPreference;
    premultipliedAlpha: false
    // preserveDrawingBuffer: true
    // transparent: true
  })
  if (gl) {
    const flare = useFlare ? makeWebGLFlare(gl) : undefined
    const particles = makeWebGLParticles(gl)

    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE)

    const timeArr = [0, 0, 0]

    await delayPromise(150 + explosionEffectDelay)
    const div = containerRef.current as HTMLDivElement | null

    if (div) {
      div.append(canvas)
    }

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
      particles.render(timeArr)

      // gl.clearColor(1, 1, 1, 0)
      // gl.enable(gl.DEPTH_TEST)
      // gl.clear(gl.COLOR_BUFFER_BIT)
      // gl.viewport(0, 0, canvas.width, canvas.height)
      requestAnimationFrame(raf)
    }
    requestAnimationFrame(raf)
  }
}
