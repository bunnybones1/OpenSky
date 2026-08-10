#define SHADER_NAME RectangleMaterial

precision highp float;

uniform highp mat4 modelViewMatrix;

#ifdef USE_MAP
  uniform sampler2D mapTexture;
  #define NEEDS_UV true
#endif

#ifdef USE_PROGRESS_FILL
  uniform vec3 progressColorLeft;
  uniform vec3 progressColorRight;
  uniform float progressFill;
  #define NEEDS_UV true
#endif

#ifdef NEEDS_UV
  varying vec2 vUv;
#endif

#ifdef USE_DASHES
  uniform mediump vec3 dashesCountRatioPadding;
  varying float vDashRatio;
#endif

#ifdef USE_GLITCH
  uniform float uTime;

  #define AMPLITUDE 0.1

  float prng(float x) {
    return fract(sin(x) * 43758.5453);
  }

  vec4 rgbaNoise(float x, float offset) {
    float i = floor(x);
    float i2 = i + 1.0;
    float f = fract(x);
    float g = smoothstep(0.0, 1.0, f);

    return vec4(
      mix(prng(i), prng(i2), g),
      mix(prng(i + offset), prng(i2 + offset), g),
      mix(prng(i + offset * 2.0), prng(i2 + offset * 2.0), g),
      mix(prng(i + offset * 3.0), prng(i2 + offset * 3.0), g)
    );
  }

  vec4 vec4pow(vec4 v, float p) {
    return vec4(pow(v.x, p), pow(v.y, p), pow(v.z, p), v.w);
  }
#endif

void main() {
  #ifdef USE_MAP
    #ifdef USE_GLITCH
      vec4 sample = rgbaNoise(uTime * 3.1415, 1.0);
      vec4 shift = vec4(pow(sample.xyz, vec3(8.0)) * vec3(AMPLITUDE), sample.w);
      
      shift *= 2.0 * shift.w - 1.0;

      vec2 rUv = vec2(vUv.x + shift.x, vUv.y);
      vec2 gUv = vec2(vUv.x + shift.y, vUv.y);
      vec2 bUv = vec2(vUv.x + shift.z, vUv.y);

      vec4 r = texture2D(mapTexture, rUv);
      vec4 g = texture2D(mapTexture, gUv);
      vec4 b = texture2D(mapTexture, bUv);

      float alpha = max(r.a, max(g.a, b.a));

      vec4 color = vec4(r.r, g.g, b.b, alpha);
      color.rgb = mix(color.rgb, vec3(prng(vUv.y * uTime)), sample.w * 0.3);

      gl_FragColor = vec4(color.rgb, color.a - sample.w * 0.1);
    #else
      gl_FragColor = texture2D(mapTexture, vUv);
    #endif
  #else
    #ifdef USE_PROGRESS_FILL
      gl_FragColor = vec4(mix(progressColorRight, progressColorLeft, step(vUv.x, progressFill)), 1);
    #else
      gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
    #endif
  #endif
  #ifdef USE_DASHES
    gl_FragColor.a *= step(vDashRatio, abs(mod(vUv.x * dashesCountRatioPadding.x + 0.5, 1.0) - 0.5) * 2.0);
    // gl_FragColor.a *= step(abs(mod(vUv.x * dashesCountRatioPadding.x, 1.0) - 0.5) * 2.0, 1.0-dashesCountRatioPadding.y);
    gl_FragColor.a *= 1.0 - max( 0.0, 2.0 * (abs(vUv.x - 0.5) - 0.5)) / dashesCountRatioPadding.z;
  #endif

  vec3 srcColor = gl_FragColor.rgb;
  #ifdef USE_COLOR_MODE_SCREEN
    vec3 mixR = modelViewMatrix[1].rgb;
    vec3 mixG = modelViewMatrix[2].rgb;
    vec3 mixB = modelViewMatrix[3].rgb;

    vec3 antiColor = vec3(1.0) - srcColor;
    vec3 mixColor = vec3(
      mixR.r + mixR.g + mixR.b,
      mixG.r + mixG.g + mixG.b,
      mixB.r + mixB.g + mixB.b
    );
    gl_FragColor = vec4(
      srcColor + mixColor * antiColor,
      modelViewMatrix[3][3] * gl_FragColor.a
    );
  #else
    vec3 mixR = modelViewMatrix[1].rgb * srcColor;
    vec3 mixG = modelViewMatrix[2].rgb * srcColor;
    vec3 mixB = modelViewMatrix[3].rgb * srcColor;
    gl_FragColor = vec4(
      mixR.r + mixR.g + mixR.b,
      mixG.r + mixG.g + mixG.b,
      mixB.r + mixB.g + mixB.b,
      modelViewMatrix[3][3] * gl_FragColor.a
    );
  #endif

}