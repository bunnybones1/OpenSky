import { bindWebglAttribute } from '../../shared/helpers/bind-webgl-attribute'
import { makeWebglShader } from '../../shared/helpers/make-webgl-shader'
import fragmentShader from './shaders/flare-frag-shader.glsl'
import vertexShader from './shaders/flare-vert-shader.glsl'

const FlareColors = {
  cyan: '0.1, 5.0, 15.0',
  orange: '15.0, 5.0, 0.5',
  yellow: '15.0, 12.0, 0.5',
  lime: '5.0, 15.0, 0.5',
  greenBlue: '0.5, 15.0, 5.0',
  pink: '1.00, 0.50, 0.97'
} as const

export type FlareColor = keyof typeof FlareColors

export function makeMagicExplosionFlare(
  gl: WebGLRenderingContext,
  flareColor: FlareColor,
  flareOpacity?: string
) {
  const fans = 24
  const totalFlareVerts = fans + 2
  const flareVertices = [0, 0]
  const flareColors = [1, 1, 1, 1]
  const aOffset = Math.random()

  for (let i = 0; i <= fans; i++) {
    const ratio = i / fans
    const a = ratio * Math.PI * 2
    const a2 = (ratio + aOffset) * Math.PI * 6
    flareVertices.push(Math.cos(a), Math.sin(a))
    flareColors.push(
      Math.sin(a2) * 0.5 + 0.5,
      Math.sin(a2 + 2) * 0.5 + 0.5,
      Math.sin(a2 + 4) * 0.5 + 0.5,
      0
    )
  }

  const flareVertexBuffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, flareVertexBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(flareVertices), gl.STATIC_DRAW)

  const flareColorBuffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, flareColorBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(flareColors), gl.STATIC_DRAW)

  const colorPrefix = `#define COLOR vec3(${FlareColors[flareColor]})`
  const opacityPrefix = `#define OPACITY ${flareOpacity || 0.5}`

  const flareShaderProgram = makeWebglShader(
    gl,
    colorPrefix + '\n' + opacityPrefix + '\n' + vertexShader,
    fragmentShader
  )

  if (!flareShaderProgram) {
    console.error('Unable to make shader program for explosion flare.')
    return
  }

  return {
    render(arr: number[]) {
      bindWebglAttribute(gl, flareShaderProgram, flareVertexBuffer, 'coordinates', 2)
      bindWebglAttribute(gl, flareShaderProgram, flareColorBuffer, 'colors', 4)

      gl.useProgram(flareShaderProgram)
      gl.uniform3fv(gl.getUniformLocation(flareShaderProgram, 'uTime'), arr)

      gl.drawArrays(gl.TRIANGLE_FAN, 0, totalFlareVerts)
    }
  }
}
