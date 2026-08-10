#define SHADER_NAME TemporalColorStripUnpackingMaterial
precision mediump float;

attribute vec4 position;
attribute vec2 uv;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;

uniform vec3 xVA_yVB_zMix;

varying vec4 uv_uv2;
varying float mixAmt;

void main() {
  gl_Position = projectionMatrix * modelViewMatrix * position;
  uv_uv2 = vec4(uv, uv);
  uv_uv2.y += xVA_yVB_zMix.x;
  uv_uv2.w += xVA_yVB_zMix.y;
  mixAmt = xVA_yVB_zMix.z;
}