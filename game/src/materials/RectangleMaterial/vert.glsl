#define SHADER_NAME RectangleMaterial

precision highp float;

attribute vec4 position;
attribute vec2 uv2;

uniform mat4 projectionMatrix;
uniform highp mat4 modelViewMatrix;
uniform float uDepth;

#ifdef USE_MAP
  #define NEEDS_UV true
#endif

#ifdef USE_PROGRESS_FILL
  #define NEEDS_UV true
#endif

#ifdef NEEDS_UV
  attribute vec2 uv;
  varying vec2 vUv;
#endif

#ifdef USE_DASHES
  uniform mediump vec3 dashesCountRatioPadding;
  varying float vDashRatio;
#endif

void main() {
  vec2 sizeScale = vec2(modelViewMatrix[0][0], -modelViewMatrix[0][1]);
  vec2 sizeTranslate = vec2(modelViewMatrix[0][2], modelViewMatrix[0][3]);
  vec2 preScale = vec2(modelViewMatrix[1][3], modelViewMatrix[2][3]);
  vec2 growMask = vec2(uv2.x, uv2.y);
  vec2 pos = ((position.xy + vec2(-36.0, 36.0) * growMask) * preScale);
  pos += growMask * sizeScale + sizeTranslate;
  gl_Position = vec4(pos, uDepth, 1.0);

  // gl_Position = projectionMatrix * modelViewMatrix * vec4(size * sizeMask, 0.0, 1.0);
  #ifdef NEEDS_UV
    vUv = uv;
  #endif
  #ifdef USE_DASHES
    vDashRatio = dashesCountRatioPadding.y / sizeScale.x * preScale.x;
    vUv.x = (vUv.x - 0.5) * (1.0 + dashesCountRatioPadding.z) + 0.5;
  #endif
}
