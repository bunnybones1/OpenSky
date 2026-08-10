import { bindAttribute } from './bindAttribute'
import fragmentShader from './flareFrag.glsl'
import vertexShader from './flareVert.glsl'
import { makeShader } from './makeShader'

export function makeWebGLFlare(gl: WebGLRenderingContext) {
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

  const flareShaderProgram = makeShader(gl, vertexShader, fragmentShader)

  return {
    render(arr: number[]) {
      bindAttribute(gl, flareShaderProgram, flareVertexBuffer, 'coordinates', 2)
      bindAttribute(gl, flareShaderProgram, flareColorBuffer, 'colors', 4)

      gl.useProgram(flareShaderProgram)
      gl.uniform3fv(gl.getUniformLocation(flareShaderProgram, 'uTime'), arr)

      gl.drawArrays(gl.TRIANGLE_FAN, 0, totalFlareVerts)
    }
  }
}
