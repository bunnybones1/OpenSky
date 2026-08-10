#define SHADER_NAME NormalMappedRayCastCylinderCascadeMaterial
precision highp float;

uniform sampler2D normalTexture;
uniform sampler2D mapTexture;
uniform float alphaTest;
uniform float aspectRatio;
uniform vec4 xyT_zwS;
uniform mat3 normalMatrix;
uniform float uUvScale;
uniform float halfScreenWidth;
uniform vec3 uLayerOffset;
uniform vec3 uBendDir;
varying float vBendSeed;
varying vec4 vUv;

//modified copy of threejs <fog_pars_fragment>
#ifdef USE_FOG
  uniform vec3 fogColor;
  // add virtual depth to surface depth for final fogDepth
  // varying float fogDepth;
  varying float vFogDepth;
  #ifdef FOG_EXP2
    uniform float fogDensity;
  #else
    uniform float fogNear;
    uniform float fogFar;
  #endif
#endif
//

void main() {
  vec2 uvRaw = vUv.xy;
  vec4 normalAccum = vec4(0.0, 0.0, 0.0, 0.0);
  float absBendSeed = abs(vBendSeed);
  float bend = absBendSeed * absBendSeed;
  float inverseBend = 1.0 - bend;
  #ifdef USE_FOG
    float fogDepth = 0.0;
  #endif

  float fogUncertainty = 1.0;
  float psuedoX = 0.0;
  for(int depthIndex = 0; depthIndex <= MAX_DEPTH_INDEX; depthIndex++) {
    float ratio = float(depthIndex) / float(MAX_DEPTH_INDEX);
    float depth = mix(NEAR_DEPTH, FAR_DEPTH, ratio * ratio);
    psuedoX = fract(psuedoX + uLayerOffset.x * depth + depth);
    vec2 uv = (uvRaw + depth * vec2(psuedoX, uLayerOffset.y)) + vUv.zw * (depth + ratio * inverseBend) * uBendDir.z;
    uv.xy -= ratio * bend * uBendDir.xy;
    uv.x -= 0.5;
    uv *= uUvScale;
    float offsetY = 0.5 * step(1.0, mod(uv.x, 2.0));
    uv += vec2(0.5, offsetY);
    // uv += vec2(0.5, 0.125 * step(0.1, mod(uv.x, 0.2)));
    // uv.x *= 1.1;
    uv.x += 0.5;
    uv.x = fract(uv.x) * 0.99 + 0.005;

    #ifdef USE_FOG
      fogDepth = mix(fogDepth, depth, fogUncertainty);
    #endif

    if(uv.y - offsetY > 0.0 && uv.y - offsetY < 0.5) {
      vec4 normalTexel = texture2D(normalTexture, -uv);
      normalAccum = mix(normalAccum, normalTexel, (normalTexel.a * (1.0 - normalAccum.a)));
      fogUncertainty *= 1.0 - normalTexel.a;
    }
  }
  if(normalAccum.a < alphaTest) {
    // gl_FragColor = vec4(1.0, 0.0, 0.0, 0.5);
    discard;
  } else {
    #ifdef TEST_OVERDRAW
    gl_FragColor = vec4(0.2, 0.2, 0, 1.0);
    #else
    //simplifying, hard to appreciate the difference
    
    // vec3 normal = normalTexel.xyz * 2.0 - 1.0;
    // float angle = atan(normal.y, normal.x) - (gl_FragCoord.x / halfScreenWidth) + 1.0;
    // float distance = length(normal.xy);
    // normal.x = cos(angle) * distance;
    // normal.y = sin(angle) * distance;
    // normal = normalize( normalMatrix * normal);
    // vec2 uv2 = ((normal.xy * 0.5 + 0.5) * xyT_zwS.zw) + xyT_zwS.xy;

    vec2 uv2 = (normalAccum.xy * xyT_zwS.zw) + xyT_zwS.xy;

    vec4 color = texture2D(mapTexture, uv2);
    gl_FragColor = vec4(color.rgb, normalAccum.a);
    #ifdef USE_FOG
      fogDepth += vFogDepth;
    #endif
    // gl_FragColor.rgb = (normal * 0.5 + 0.5);
    #endif
  }

  #include <fog_fragment>
}
