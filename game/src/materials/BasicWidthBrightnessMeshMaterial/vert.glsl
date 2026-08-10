#define SHADER_NAME BasicWidthBrightnessMeshMaterial

precision highp float;

uniform vec4 uRGBA;
uniform float uGrowWidth;
attribute vec2 uv;
attribute vec4 position;
varying vec4 vColor;

uniform mat4 projectionMatrix;
uniform mat4 modelViewMatrix;

void main() {
  vec4 pos = position;
  pos.x += uv.x * uGrowWidth;
  gl_Position = projectionMatrix * modelViewMatrix * pos;
  // gl_Position.xy = position.xy * vec2(0.015);
  vColor = vec4(uRGBA.rgb * uv.y, uRGBA.a);
}