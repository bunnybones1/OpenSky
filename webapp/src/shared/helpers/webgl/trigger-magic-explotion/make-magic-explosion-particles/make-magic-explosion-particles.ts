import { bindWebglAttribute } from '../../shared/helpers/bind-webgl-attribute'
import { makeWebglShader } from '../../shared/helpers/make-webgl-shader'
import fragmentShader from './shaders/particle-frag-shader.glsl'
import vertexShader from './shaders/particle-vert-shader.glsl'

export function makeMagicExplosionParticles(gl: WebGLRenderingContext) {
  const particleIds: number[] = []

  const totalParticleVerts = 100

  const offset = Math.random() * 150
  for (let i = 0; i < totalParticleVerts; i++) {
    particleIds.push(i * 0.01 + offset)
  }

  const particleIdBuffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, particleIdBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(particleIds), gl.STATIC_DRAW)

  const particleShaderProgram = makeWebglShader(gl, vertexShader, fragmentShader)

  if (!particleShaderProgram) {
    console.error('Unable to make shader program for explosion particles.')
    return
  }

  return {
    render(arr: number[]) {
      bindWebglAttribute(gl, particleShaderProgram, particleIdBuffer, 'id', 1)

      gl.useProgram(particleShaderProgram)
      gl.uniform3fv(gl.getUniformLocation(particleShaderProgram, 'uTime'), arr)

      gl.drawArrays(gl.POINTS, 0, totalParticleVerts)
    }
  }
}
