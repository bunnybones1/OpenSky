#define SHADER_NAME PortalWaveMeshMaterial

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

varying float topBottom;

#ifdef USE_UV_ST
uniform vec4 uUvST;
#endif

void main() {
  vec2 baseScroll = vec2(timeX, timeY);
  
  #ifdef USE_UV_ST
    vec2 moddedUv = (uv * uUvST.xy) + uUvST.zw;
  #else
    vec2 moddedUv = uv;
  #endif

  vUv.xy = moddedUv + baseScroll;
  vUv.zw = moddedUv * vec2(1.0, 2.0) + baseScroll * vec2(1.0, 0.5);
  vUv += uniqueness.xxyy;

  vOpacity = max(0.0, (opacity - moddedUv.x));

  gl_Position = projectionMatrix * modelViewMatrix * position;

  topBottom = position.z * 16.777 + 0.5;
}