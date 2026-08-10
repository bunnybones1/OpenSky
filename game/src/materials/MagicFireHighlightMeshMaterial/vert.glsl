#define SHADER_NAME MagicFireHighlightMeshMaterial

precision highp float;

attribute vec2 uv;
attribute vec4 position;
attribute vec4 antiposition;

#ifdef USE_PROGRESS
  varying float vProgressThreshold;
  attribute vec2 uv2;
#endif

uniform mat4 projectionMatrix;
uniform mat4 modelViewMatrix;

uniform float time;
uniform vec2 alphaThreshold;
uniform vec2 uniqueness;
uniform vec2 scrollTiling;
uniform float opacity;
uniform float uThicknessRatio;
uniform float uThicknessBase;
uniform float uPerpectiveCompensation;
uniform float uUvScaleV;

#ifdef USE_LENGTH_RATIO
  uniform float lengthRatio;
  attribute vec3 color;
#endif

varying vec4 vUv;
varying float vOpacity;

#ifdef USE_TWO_COLORS
  varying float vColorMix;
#endif

#ifdef USE_UV_ST
  uniform vec4 uUvST;
#endif


#ifdef USE_2D_MODE
  uniform float uDepth;
  attribute vec2 uv2; //the size mask
  attribute vec2 texcoord_2; //the uv compensation mask
#endif

void main() {
  vec2 baseScroll = time * scrollTiling;
  vec2 layer2Scroll = baseScroll * vec2(-1.2753, 1.032);
  #ifdef USE_UV_ST
    vec2 moddedUv = (uv * uUvST.xy) + uUvST.zw;
  #else
    vec2 moddedUv = uv;
  #endif

  // float growAmt = (sin(time * 200.0) * 0.5 + 0.5);
  // float growAmt = clamp(sin(time * 100.0) + 0.5, 0.0, 1.0);
  float growAmt = uThicknessRatio;
  // float growAmt = opacity;
  // float growAmt2 = 1.0-growAmt;
  // growAmt = 1.0 - (growAmt2 * growAmt2 * growAmt2);
  float shrinkAmt = 1.0 - growAmt;

  #ifdef USE_LENGTH_RATIO
    moddedUv.x += lengthRatio * color.r * 150.0;
  #endif

  #ifdef USE_2D_MODE
    vec2 sizeScale = vec2(modelViewMatrix[0][0], -modelViewMatrix[0][1]);
    vec2 preScale = vec2(modelViewMatrix[1][3], modelViewMatrix[2][3]);
    vec2 uvCompensate = texcoord_2 * sizeScale / preScale * 0.03;
    float uCompensate = (uvCompensate.x + uvCompensate.y);
    moddedUv.x -= uCompensate * 4.0;
    // moddedUv.y -= uCompensate;
    // vUv.w += uCompensate;
  #endif

  vUv.xy = moddedUv;
  vUv.zw = moddedUv;
  vUv.yw = (vUv.yw * growAmt + shrinkAmt) * uUvScaleV;
  vUv.y += uv.x * 0.05;
  vUv.w -= uv.x * 0.1234;
  // vUv.w = vUv.w * growAmt + shrinkAmt;

  vec2 uvScale = vec2(0.1, 0.4);
  vUv.xy = vUv.xy * uvScale + baseScroll;
  vUv.zw = vUv.zw * uvScale + layer2Scroll;

  // vUv.w += moddedUv.x * 2.5;
  // vUv.y += vUv.x * 0.235;
  // vUv.w += vUv.z * 0.1235;
  

  // vOpacity = (moddedUv.y * alphaThreshold.x + opacity + alphaThreshold.y) * alphaThreshold.x;
  vOpacity = uv.y * opacity;
  #ifdef USE_LENGTH_RATIO
    vOpacity = mix(vOpacity, vOpacity * 0.85, 1.0-color.r);
  #endif
  vec4 moddedPosition = vec4(position.xyz + antiposition.xyz, 1.0);
  moddedPosition.xyz -= (antiposition.xyz * growAmt * uThicknessBase);

  #ifdef USE_LENGTH_RATIO
    moddedPosition.z += lengthRatio * color.g;
  #endif

  #ifdef USE_TWO_COLORS
    vColorMix = color.r * 3.0;
  #endif

  vUv += uniqueness.xxyy;

  #ifdef USE_PROGRESS
    vProgressThreshold = uv2.x;
  #endif

  #ifdef USE_2D_MODE
    vec2 sizeTranslate = vec2(modelViewMatrix[0][2], modelViewMatrix[0][3]);
    vec2 growMask = uv2;
    vec2 pos = ((moddedPosition.xy + vec2(-36.0, 36.0) * growMask) * preScale);
    pos += growMask * sizeScale + sizeTranslate;
    gl_Position = vec4(pos, uDepth, 1.0);
  #else
    gl_Position = projectionMatrix * modelViewMatrix * moddedPosition;
  #endif
  // gl_Position *= 0.7;
  gl_Position *= mix(uPerpectiveCompensation, 1.0, uv.y * growAmt);
}