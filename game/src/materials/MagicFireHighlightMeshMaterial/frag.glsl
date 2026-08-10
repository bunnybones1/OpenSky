#define SHADER_NAME MagicFireHighlightMeshMaterial

precision highp float;

uniform sampler2D uMap;
uniform vec2 uOpacityRamp;

varying vec4 vUv;
varying float vOpacity;

#ifdef USE_PROGRESS
uniform float progress;
varying float vProgressThreshold;
#endif

uniform vec3 color1;
#ifdef USE_TWO_COLORS
uniform vec3 color2;
varying float vColorMix;
#endif

uniform vec4 uColorStrength;
uniform float uCoreHotness;

uniform mat4 modelViewMatrix;

void main() {

  vec4 sample = texture2D(uMap, vUv.xy);
  vec4 sample2 = texture2D(uMap, vUv.zw);

  #ifdef USE_TWO_COLORS
  vec3 color = mix(color1, color2, clamp(vColorMix, 0.0, 1.0));
  #else
  vec3 color = color1;
  #endif

  #ifdef USE_PROGRESS
    float progressStrength = smoothstep(progress, progress + 0.04, vProgressThreshold);
    float finalOpacity = mix(vOpacity, -1.0, progressStrength) - (progressStrength * progressStrength - progressStrength) * 2.0;
  #else
    float finalOpacity = vOpacity;
  #endif


  // vec4 finalColor = sample;
  vec4 finalColor = min(sample, sample2) * vec4(color * (1.0 + finalOpacity), 1.0);
  finalColor.a += finalOpacity * uOpacityRamp.x + uOpacityRamp.y;

  finalColor.rgb *= clamp(finalColor.a * 2.0, 0.0, 1.0);

  finalColor.a = clamp(clamp(finalColor.a, 0.0, 1.0) * finalOpacity, 0.0, 1.0);
  
  // gl_FragColor = finalColor;
  gl_FragColor = clamp(finalColor, 0.0, 1.0);
  gl_FragColor.rgb /= 1.0 - (gl_FragColor.a * uCoreHotness);
  gl_FragColor *= uColorStrength;
  // gl_FragColor = vec4(vec3(opacity), 1.0);
  // gl_FragColor = vec4(sample2.rgb, 1.0);


  vec3 srcColor = gl_FragColor.rgb;
  #ifdef USE_2D_MODE
    vec3 mixR = modelViewMatrix[1].rgb * srcColor;
    vec3 mixG = modelViewMatrix[2].rgb * srcColor;
    vec3 mixB = modelViewMatrix[3].rgb * srcColor;
    gl_FragColor.xyz = vec3(
      mixR.r + mixR.g + mixR.b,
      mixG.r + mixG.g + mixG.b,
      mixB.r + mixB.g + mixB.b
    );
    gl_FragColor *= modelViewMatrix[3][3];
  #endif
}