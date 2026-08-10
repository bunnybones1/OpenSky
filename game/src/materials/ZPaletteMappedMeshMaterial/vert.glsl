#define SHADER_NAME ZPaletteMappedMeshMaterial

precision highp float;

uniform vec3 uPaletteRangeMapper;
uniform float uPaletteVOffset;
uniform float uAspect;
attribute vec4 position;

uniform mat4 projectionMatrix;
uniform mat4 modelViewMatrix;
uniform sampler2D uPaletteMap;

varying vec4 vColor;

#ifdef USE_SCREENSPACE
uniform vec2 scale;
uniform vec4 clipSpacePosition;
#endif

#ifdef USE_OVERLAY_COLOR
uniform vec3 uOverlayColor;
#endif

#ifdef USE_OPACITY
uniform float uOpacity;
#endif

void main() {
  float u = position.y;
  float uGamma = mix(u, u * u, uPaletteRangeMapper.z);
  float adjustedU = uPaletteRangeMapper.y * (uGamma) + uPaletteRangeMapper.x;

  vec4 texel = texture2D(uPaletteMap, vec2(adjustedU, 1.0 - uPaletteVOffset));

  vColor = texel;
  #ifdef USE_OPACITY
  vColor.a *= uOpacity;
  #endif

  #ifdef USE_OVERLAY_COLOR
  vec3 x = vColor.rgb;
  vec3 m = uOverlayColor;
  vec3 colorIn = x * m;
  vec3 colorOut = (1.0 - x) * (m - 1.0) + 1.0;

  vColor.rgb = x * colorOut + (1.0 - x) * colorIn;
  #endif

  #ifdef USE_SCREENSPACE
  vec2 finalOffset = (position.xz) * scale;
  finalOffset.x /= uAspect;
  finalOffset.y *= -1.0;
  gl_Position = clipSpacePosition;
  gl_Position.xy += finalOffset;
  #else
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position.x, 0.0, position.z, 1.0);
  #endif
}