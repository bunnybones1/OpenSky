#define SHADER_NAME LightCacheMeshMaterial

precision mediump float;
//#define TEXTURE_LOD_EXT
// #define texture2DLodEXT textureLod


varying float vReflectionStrength;
varying vec3 vReflectionNormal;
#ifndef SKIP_TRANSMISSION_COLOR
  varying vec3 vTransmissionNormal;
#endif

#ifndef USE_METALLIC_DIFFUSE
  varying vec3 vDiffusionNormal;
#endif
uniform sampler2D uLightCacheTexture;

#ifndef USE_FAKE_HDRI
  uniform float uExposureFix;
#endif

#ifdef USE_METAL_SHINE
  varying float vSawToothSrc;
#endif

#ifdef USE_TRANSPARENCY
  varying float vTransparency;
#endif

#ifdef USE_FINAL_COLOR_SCALE
  uniform vec3 uFinalColorScale;
#endif

#include <fog_pars_fragment>

vec4 sampleLightCache(vec2 uv, float mipLevel) {
  //TODO find and fix horizon seams
  vec2 mipLevelUv = (uv + vec2(mod(mipLevel, 2.99), floor(mipLevel / 2.99))) * 0.3333;
  vec4 texel = texture2D(uLightCacheTexture, mipLevelUv);
  return texel;
}

vec2 normalToUv(vec3 normal) {
  vec2 uv = vec2(normal.x, -normal.y) * 0.48 + 0.51;
  return uv;
}

void main() {
  vec2 reflectionUv = normalToUv(normalize(vReflectionNormal));
  #ifdef USE_METALLIC_DIFFUSE
    #define DIFFUSE_UV reflectionUv
  #else
    vec2 diffuseUv = normalToUv(vDiffusionNormal);
    #define DIFFUSE_UV diffuseUv
  #endif

  #ifdef WORN_EDGES
    vec2 wear2 = WORN_EDGES * WORN_EDGES;
    float wear = max(wear2.x, wear2.y);
    wear *= wear;
  #endif

  #ifdef SKIP_DIFFUSION_ROUGHNESS
      float diffusionSpecMipLevel = 0.0;
  #else
    #ifdef WORN_EDGES
      float diffusionSpecMipLevel = DIFFUSION_ROUGHNESS + wear;
    #else
      float diffusionSpecMipLevel = DIFFUSION_ROUGHNESS;
    #endif
  #endif

  #ifdef USE_DIFFUSION_SPEC_INTERPOLATION
    vec3 diffusionLPSampleLow = sampleLightCache(DIFFUSE_UV, floor(diffusionSpecMipLevel)).rgb;
    vec3 diffusionLPSampleHigh = sampleLightCache(DIFFUSE_UV, ceil(diffusionSpecMipLevel)).rgb;
    vec3 diffusionLPSample = mix(diffusionLPSampleLow, diffusionLPSampleHigh, fract(diffusionSpecMipLevel));
  #else
    vec3 diffusionLPSample = sampleLightCache(DIFFUSE_UV, floor(diffusionSpecMipLevel)).rgb;
  #endif

  #ifndef SKIP_TRANSMISSION_COLOR

    vec2 refractionUv = normalToUv(vTransmissionNormal);


    #ifndef SKIP_TRANSMISSION_ROUGHNESS
      #ifdef WORN_EDGES
        float refractionSpecMipLevel = TRANSMISSION_ROUGHNESS + wear;
      #else
        float refractionSpecMipLevel = TRANSMISSION_ROUGHNESS;
      #endif
    #else
      #ifdef WORN_EDGES
        float refractionSpecMipLevel = wear;
      #else
        float refractionSpecMipLevel = 0.0;
      #endif
    #endif

    #ifdef USE_TRANSMISSION_SPEC_INTERPOLATION
      vec3 refractionLPSampleLow = sampleLightCache(refractionUv, floor(refractionSpecMipLevel)).rgb;
      vec3 refractionLPSampleHigh = sampleLightCache(refractionUv, ceil(refractionSpecMipLevel)).rgb;
      vec3 refractionLPSample = mix(refractionLPSampleLow, refractionLPSampleHigh, fract(refractionSpecMipLevel));
    #else
      vec3 refractionLPSample = sampleLightCache(refractionUv, floor(refractionSpecMipLevel)).rgb;
    #endif

    #ifdef SKIP_TRANSMISSION_AMOUNT
      gl_FragColor = vec4(diffusionLPSample * DIFFUSION_COLOR, 1.0);
    #elif defined(MIX_TRANSMISSION_AMOUNT)
      gl_FragColor = vec4(mix(diffusionLPSample * DIFFUSION_COLOR, refractionLPSample * TRANSMISSION_COLOR, TRANSMISSION_AMOUNT), 1.0);
    #elif defined(SIMPLE_TRANSMISSION_AMOUNT)
      gl_FragColor = vec4(refractionLPSample * TRANSMISSION_COLOR, 1.0);
    #endif
  #else
    gl_FragColor = vec4(diffusionLPSample * DIFFUSION_COLOR, 1.0);
  #endif

  // float split = step(gl_FragCoord.x,1200.0);
  // float reflectionSpecMipLevel = ROUGHNESS + wear * mix(TRANSMISSION, max(TRANSMISSION, 6.0-METALNESS), split);
  #ifdef SKIP_REFLECTION_ROUGHNESS
      float reflectionSpecMipLevel = 0.0;
  #else
    #ifdef WORN_EDGES
      float reflectionSpecMipLevel = REFLECTION_ROUGHNESS + wear;
    #else
      float reflectionSpecMipLevel = REFLECTION_ROUGHNESS;
    #endif
  #endif
  
  #ifdef USE_REFLECTION_SPEC_INTERPOLATION
    vec3 reflectionLPSampleLow = sampleLightCache(reflectionUv, floor(reflectionSpecMipLevel)).rgb;
    vec3 reflectionLPSampleHigh = sampleLightCache(reflectionUv, ceil(reflectionSpecMipLevel)).rgb;
    vec3 reflectionLPSample = mix(reflectionLPSampleLow, reflectionLPSampleHigh, fract(reflectionSpecMipLevel));
  #else
    vec3 reflectionLPSample = sampleLightCache(reflectionUv, floor(reflectionSpecMipLevel)).rgb;
  #endif
  gl_FragColor.rgb = mix(gl_FragColor.rgb, reflectionLPSample * REFLECTION_COLOR, vReflectionStrength);

  // vec3 antiRGB = 1.0 - min(gl_FragColor.rgb, 1.0);
  // gl_FragColor.rgb = 1.0 - (antiRGB * antiRGB);

  #if defined(BLACKOUT) && !defined(BLACKOUT_AFTER_EMISSION)
    gl_FragColor.rgb *= BLACKOUT;
  #endif
  
  #ifdef EMISSION
    gl_FragColor.rgb += EMISSION;
  #endif

  #if defined(BLACKOUT) && defined(BLACKOUT_AFTER_EMISSION)
    gl_FragColor.rgb *= BLACKOUT;
  #endif

  #ifdef USE_FAKE_HDRI
    float fhdri_brightness = ceil(min(256.0, max(max(gl_FragColor.r, gl_FragColor.g), max(gl_FragColor.b, 1.0)))));
    gl_FragColor.rgb /= fhdri_brightness;
    gl_FragColor.a = 1.0 - ((fhdri_brightness - 1.0) / 255.0;
  #endif
    // gl_FragColor.rg = DIFFUSE_UV;

  // gl_FragColor.rgb = vDiffusionNormal * 0.5 + 0.5;
  #ifdef USE_METAL_SHINE
    float sawTooth = max(0.0, mod(vSawToothSrc, 48.0) - 47.0);
    gl_FragColor.rgb += 0.2 * sawTooth * (step(0.12, mod(sawTooth, 0.6)) - 0.4);
  #endif

  #ifdef USE_TRANSPARENCY
    // gl_FragColor.rgb *= 0.8 - vTransparency;
    gl_FragColor.a = vTransparency;
  #endif
  #ifdef USE_FINAL_COLOR_SCALE
    gl_FragColor.rgb *= uFinalColorScale;
  #endif
  // gl_FragColor.rgb = vReflectionNormal.rgb; 
  // gl_FragColor.rgb = vec3(reflectionSpecMipLevel / 8.0);
  // gl_FragColor.rgb = diffusionLPSample.rgb; 
  // gl_FragColor.rgb = COLOR; 
  // gl_FragColor.rgb = vec3(METALNESS); 
  // gl_FragColor.rgb = EMISSION; 
  // gl_FragColor.rgb = vec3(ROUGHNESS / 8.0); 

  // gl_FragColor.rgb = normalize(vReflectionNormal).yyy * 0.5 + 0.5;

  #include <fog_fragment>
}