export const makeWebglShader = (
  gl: WebGLRenderingContext,
  vertexShaderSrc: string,
  fragmentShaderSrc: string
) => {
  const vertShader = gl.createShader(gl.VERTEX_SHADER)

  if (!vertShader) {
    console.error(`Unable to create shader ${gl.VERTEX_SHADER}`)
    return
  }

  gl.shaderSource(vertShader, vertexShaderSrc)
  gl.compileShader(vertShader)

  const vertShaderMessage = gl.getShaderInfoLog(vertShader)

  if (vertShaderMessage) {
    console.error(vertShaderMessage)
  }

  const fragShader = gl.createShader(gl.FRAGMENT_SHADER)

  if (!fragShader) {
    console.error(`Unable to greate frag shader ${gl.FRAGMENT_SHADER}`)
    return
  }

  gl.shaderSource(fragShader, fragmentShaderSrc)
  gl.compileShader(fragShader)

  const fragShaderMessage = gl.getShaderInfoLog(fragShader)

  if (fragShaderMessage) {
    console.error(fragShaderMessage)
  }

  const shaderProgram = gl.createProgram()

  if (!shaderProgram) {
    console.error('Unable to create shader program')
    return
  }

  gl.attachShader(shaderProgram, vertShader)
  gl.attachShader(shaderProgram, fragShader)
  gl.linkProgram(shaderProgram)
  gl.useProgram(shaderProgram)

  return shaderProgram
}
