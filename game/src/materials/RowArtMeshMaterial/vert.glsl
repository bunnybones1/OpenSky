precision highp float;

attribute vec4 position;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;

uniform vec3 uDecalColor;
uniform float uDepth;

varying vec3 vColor;
varying float vPretint;
attribute vec2 uv;
varying vec2 vUvs;

void main() {
  float colorMix = pow(COLOR_MASK_ATTRIBUTE * 2.0, 2.0);
  vColor = mix(uDecalColor * min(1.0, colorMix), vec3(1.0), max(0.0, colorMix - 1.0));

  vec2 sizeScale = vec2(modelViewMatrix[0][0], -modelViewMatrix[0][1]);
  vec2 sizeTranslate = vec2(modelViewMatrix[0][2], modelViewMatrix[0][3]);
  vec2 preScale = vec2(modelViewMatrix[1][3], modelViewMatrix[2][3]);
  vec2 pos = position.xy * preScale + sizeTranslate;
  gl_Position = vec4(pos, uDepth, 1.0);

  vPretint = PRETINT_ATTRIBUTE;
  vUvs = uv;
}