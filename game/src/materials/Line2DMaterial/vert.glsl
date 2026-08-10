#define SHADER_NAME Line2DMaterial

precision highp float;

attribute vec4 position;

uniform mat4 modelViewMatrix;
uniform float uDepth;

void main() {
  vec2 sizeScale = vec2(modelViewMatrix[0][0], -modelViewMatrix[0][1]);
  vec2 sizeTranslate = vec2(modelViewMatrix[0][2], modelViewMatrix[0][3]);
  vec2 pos = (position.xy * sizeScale) + sizeTranslate;
  gl_Position = vec4(pos, uDepth, 1.0);
}