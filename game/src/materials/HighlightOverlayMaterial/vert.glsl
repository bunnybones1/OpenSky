precision highp float;

attribute vec2 uv2;
attribute vec4 position;

uniform mat4 projectionMatrix;
uniform highp mat4 modelViewMatrix;
uniform float uDepth;
varying vec2 vUv;

void main() {
  vec2 sizeScale = vec2(modelViewMatrix[0][0], -modelViewMatrix[0][1]);
  vec2 sizeTranslate = vec2(modelViewMatrix[0][2], modelViewMatrix[0][3]);
  vec2 preScale = vec2(modelViewMatrix[1][3], modelViewMatrix[2][3]);
  vec2 growMask = vec2(uv2.x, uv2.y);
  vec2 pos = ((position.xy + vec2(-36.0, 36.0) * growMask) * preScale);
  pos += growMask * sizeScale + sizeTranslate;
  gl_Position = vec4(pos, uDepth, 1.0);
  vUv = uv2;
}
