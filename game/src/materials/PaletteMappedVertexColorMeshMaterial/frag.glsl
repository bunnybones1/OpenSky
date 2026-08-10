#define SHADER_NAME PaletteMappedVertexColorMeshMaterial
precision highp float;
varying vec4 vColor;

#ifdef FANCY_HIGHLIGHT
  uniform sampler2D uFancyMap;
  uniform vec3 uFancyColor;
  varying vec2 vTexCoord;
  varying vec4 vFancyTexCoord;
  varying float vFancyMask;
#endif
#ifdef USE_FRAGMENT_TEXTURE_SAMPLER 
  uniform sampler2D uPaletteMap;
  varying vec2 vUv;
  varying vec3 vColorMixR;
  varying vec3 vColorMixG;
  varying vec3 vColorMixB;
  varying float vOpacity;
#endif
#ifdef USE_ALPHA_TEXTURE
  uniform sampler2D uAlphaTexture;
  varying vec2 vAlphaTexCoord;
  varying float vAlphaTextureBlend;
#endif

void main() {
  #ifdef FANCY_HIGHLIGHT
    vec4 sample = texture2D(uFancyMap, vFancyTexCoord.xy);
    vec4 sample2 = texture2D(uFancyMap, vFancyTexCoord.zw);

    vec2 edgeDist = abs(vTexCoord);
    float edges = max(edgeDist.x, edgeDist.y);
    float edgeBoost = pow(edges, 3.) * 0.7 + 0.2;
    
    float fancyHighlightMask = sample.a * sample2.a * vFancyMask;
    vec3 bright = vColor.rgb + fancyHighlightMask * uFancyColor;
    vec3 dark = vColor.rgb * vColor.rgb;
    float fancyEdgeMask = edgeBoost + fancyHighlightMask - 0.5;
    vec3 finalColor = mix(dark, bright, fancyEdgeMask);

    gl_FragColor = vec4(clamp(finalColor, 0.0, 1.0), vColor.a);
  #else 
    #ifndef USE_FRAGMENT_TEXTURE_SAMPLER 
      gl_FragColor = vColor;
    #else
      vec4 texel = texture2D(uPaletteMap, vUv);

      vec3 srcColor = texel.rgb;
      vec3 mixR = vColorMixR * srcColor;
      vec3 mixG = vColorMixG * srcColor;
      vec3 mixB = vColorMixB * srcColor;

      gl_FragColor = vec4(
        mixR.r + mixR.g + mixR.b,
        mixG.r + mixG.g + mixG.b,
        mixB.r + mixB.g + mixB.b,
        #ifdef USE_ALPHA_TEXTURE
          vOpacity
        #else
          vOpacity * texel.a
        #endif
      );
    #endif
  #endif
  
  #ifdef USE_ALPHA_TEXTURE
    vec4 sample2 = texture2D(uAlphaTexture, vAlphaTexCoord);
    gl_FragColor.rgb = mix(sample2.rgb, gl_FragColor.rgb, vAlphaTextureBlend);
  #endif
}
