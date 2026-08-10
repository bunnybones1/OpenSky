precision highp float;

attribute vec4 xyuv;
#ifdef USE_COLOR_UNIFORM
  uniform vec3 color;
#else
  attribute vec3 color;
#endif

#ifdef USE_WEIGHT_UNIFORM
  uniform float weight;
#else
  attribute float weight;
#endif

#ifdef USE_SCREENSPACE
  uniform vec2 offset;
  uniform float prescale;
  uniform vec4 clipSpacePosition;
  uniform vec2 pixelSizeInClipSpace;
#endif

#ifdef USE_2D_MODE
  uniform float uDepth;
#endif
varying vec2 vUv;
varying vec3 vColor;
varying float vWeight;

void main() {
  vUv = xyuv.zw;
  vColor = color;
  vWeight = weight;

  #ifdef USE_SCREENSPACE
    vec2 finalOffset = (offset + xyuv.xy) * pixelSizeInClipSpace * prescale;
    #ifdef CONSTANT_SIZE_ON_SCREEN
     finalOffset *= clipSpacePosition.w;
    #endif
    gl_Position = clipSpacePosition;
    gl_Position.xy += finalOffset;
  #else
    #ifdef USE_2D_MODE
      vec2 sizeScale = vec2(modelViewMatrix[0][0], -modelViewMatrix[0][1]);
      vec2 sizeTranslate = vec2(modelViewMatrix[0][2], modelViewMatrix[0][3]);
      vec2 preScale = vec2(modelViewMatrix[1][3], modelViewMatrix[2][3]);
      // vec2 pos = xyuv.xy * preScale;
      // pos += vec2(0.5, 0.5) * sizeScale + sizeTranslate;
      vec2 pos = xyuv.xy * preScale + sizeTranslate;
      // pos += sizeScale + sizeTranslate;
      gl_Position = vec4(pos, uDepth, 1.0);
    #else
      gl_Position = projectionMatrix * modelViewMatrix * vec4(xyuv.xy, 0.0, 1.0);
    #endif
  #endif
}