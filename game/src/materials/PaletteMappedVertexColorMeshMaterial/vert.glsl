#define SHADER_NAME PaletteMappedVertexColorMeshMaterial

precision highp float;

uniform float uOpacity;
uniform float uPaletteVOffset;
uniform vec2 uOriginalAssetSize;
attribute vec4 position;
attribute vec2 uv2;
#ifdef SECONDARY_STRETCH_ATTRIBUTE
  uniform float uStretch;
#else
  attribute vec2 uv; //pixel palette mapping
#endif

uniform mat4 projectionMatrix;
uniform mat4 modelViewMatrix;
uniform float uDepth;
varying vec4 vColor;
#ifdef FANCY_HIGHLIGHT
	uniform float uTime;
  varying vec2 vTexCoord;
  varying vec4 vFancyTexCoord;
  varying float vFancyMask;
#endif

#ifdef USE_ALPHA_TEXTURE
  varying vec2 vAlphaTexCoord;
  varying float vAlphaTextureBlend;
#endif
#ifndef USE_FRAGMENT_TEXTURE_SAMPLER 
  uniform sampler2D uPaletteMap;
#else  
  varying vec2 vUv;
  varying vec3 vColorMixR;
  varying vec3 vColorMixG;
  varying vec3 vColorMixB;
  varying float vOpacity;
#endif
#ifdef USE_FRAGMENT_TEXTURE_SAMPLER
#endif

#ifdef USE_ROTATION_MATRIX
  uniform vec2 uRotationMatrix;
#endif

void main() {
  vec2 sizeScale = vec2(modelViewMatrix[0][0], -modelViewMatrix[0][1]);
  vec2 sizeTranslate = vec2(modelViewMatrix[0][2], modelViewMatrix[0][3]);
  vec2 preScale = vec2(modelViewMatrix[1][3], modelViewMatrix[2][3]);
  vec2 growMask = uv2;

  vec2 position2 = position.xy;
  #ifdef USE_ROTATION_MATRIX
    // a simple 2d rotation around 0,0
    // the sin/cos values are precomputed on the CPU
    // x = xcos - ysin
    // y = xsin + ycos
    position2 = vec2(
      position2.x * uRotationMatrix.x - position2.y * uRotationMatrix.y,
      position2.x * uRotationMatrix.y + position2.y * uRotationMatrix.x
    );
  #endif
  vec2 pos = ((position2 - uOriginalAssetSize * growMask) * preScale);
  pos += growMask * sizeScale + sizeTranslate;
  gl_Position = vec4(pos, uDepth, 1.0);
  #ifndef USE_FRAGMENT_TEXTURE_SAMPLER 
    vec4 texel = texture2D(uPaletteMap, vec2(uv.x, 1.0 -uPaletteVOffset));

    vec3 srcColor = texel.rgb;
    vec3 mixR = modelViewMatrix[1].rgb * srcColor;
    vec3 mixG = modelViewMatrix[2].rgb * srcColor;
    vec3 mixB = modelViewMatrix[3].rgb * srcColor;

    vColor = vec4(
      mixR.r + mixR.g + mixR.b,
      mixG.r + mixG.g + mixG.b,
      mixB.r + mixB.g + mixB.b,
      #ifdef USE_ALPHA_TEXTURE
        modelViewMatrix[3][3]
      #else
        modelViewMatrix[3][3] * texel.a
      #endif
    );
  #else
    vUv = uv;
    vColorMixR = modelViewMatrix[1].rgb;
    vColorMixG = modelViewMatrix[2].rgb;
    vColorMixB = modelViewMatrix[3].rgb;
    vOpacity = modelViewMatrix[3][3];
  #endif
  #ifdef FANCY_HIGHLIGHT
    vTexCoord = (uv2) * 2. - 1.;
    vec2 noiseCoord = vTexCoord * vec2(0.5, 0.2);
    vFancyTexCoord = vec4(noiseCoord + vec2(0.34, 0.71), -noiseCoord) + uTime * vec4(-1.0, 1.0, 1.0, 2.0);
    vFancyMask = step(0.001, texel.r);
  #endif

  #ifdef USE_ALPHA_TEXTURE
    vAlphaTexCoord = uv2;
    vAlphaTextureBlend = texel.a;
  #endif

}