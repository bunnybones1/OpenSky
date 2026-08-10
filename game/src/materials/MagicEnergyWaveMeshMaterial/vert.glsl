#define SHADER_NAME MagicEnergyWaveMeshMaterial

attribute vec2 uv;
attribute vec4 position;

uniform mat4 projectionMatrix;
uniform mat4 modelViewMatrix;

uniform float timeX;
uniform float timeY;
uniform vec2 uniqueness;
uniform float opacity;


attribute vec3 color;
varying vec4 vUv;
varying float vOpacity;

void main() {
  vec2 baseScroll = vec2(timeX, timeY);

  vUv.xy = uv + baseScroll;
  vUv.zw = uv + baseScroll * vec2(1.0, -1.0);
  vUv += uniqueness.xxyy;

  vOpacity = max(0.0, color.r * opacity);

  gl_Position = projectionMatrix * modelViewMatrix * position;
}