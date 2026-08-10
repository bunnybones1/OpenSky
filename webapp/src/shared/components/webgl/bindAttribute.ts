export function bindAttribute(
  gl: WebGLRenderingContext,
  shaderProgram: WebGLProgram,
  vertexBuffer: WebGLBuffer | null,
  attributeName: string,
  size: number
) {
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer)
  const attribLoc = gl.getAttribLocation(shaderProgram, attributeName)
  gl.vertexAttribPointer(attribLoc, size, gl.FLOAT, false, 0, 0)
  gl.enableVertexAttribArray(attribLoc)
}
