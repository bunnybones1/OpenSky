export function makeShader(
  gl: WebGLRenderingContext,
  vertexShaderSrc: string,
  fragmentShaderSrc: string
) {
  const vertShader = gl.createShader(gl.VERTEX_SHADER)!
  gl.shaderSource(vertShader, vertexShaderSrc)
  gl.compileShader(vertShader)
  const vertShaderMessage = gl.getShaderInfoLog(vertShader)
  if (vertShaderMessage) {
    console.error(vertShaderMessage)
  }
  const fragShader = gl.createShader(gl.FRAGMENT_SHADER)!
  gl.shaderSource(fragShader, fragmentShaderSrc)
  gl.compileShader(fragShader)
  const fragShaderMessage = gl.getShaderInfoLog(fragShader)
  if (fragShaderMessage) {
    console.error(fragShaderMessage)
  }

  const shaderProgram = gl.createProgram()!
  gl.attachShader(shaderProgram, vertShader)
  gl.attachShader(shaderProgram, fragShader)
  gl.linkProgram(shaderProgram)
  gl.useProgram(shaderProgram)

  return shaderProgram
}
