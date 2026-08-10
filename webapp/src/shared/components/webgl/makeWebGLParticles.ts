import { bindAttribute } from './bindAttribute'
import { makeShader } from './makeShader'
import fragmentShader from './particleFrag.glsl'
import vertexShader from './particleVert.glsl'

export function makeWebGLParticles(gl: WebGLRenderingContext) {
  const particleIds: number[] = []

  const totalParticleVerts = 100

  const offset = Math.random() * 150
  for (let i = 0; i < totalParticleVerts; i++) {
    particleIds.push(i * 0.01 + offset)
  }

  const particleIdBuffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, particleIdBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(particleIds), gl.STATIC_DRAW)

  const particleShaderProgram = makeShader(gl, vertexShader, fragmentShader)

  return {
    render(arr: number[]) {
      bindAttribute(gl, particleShaderProgram, particleIdBuffer, 'id', 1)

      gl.useProgram(particleShaderProgram)
      gl.uniform3fv(gl.getUniformLocation(particleShaderProgram, 'uTime'), arr)

      gl.drawArrays(gl.POINTS, 0, totalParticleVerts)
    }
  }
}
