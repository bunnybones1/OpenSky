#define SHADER_NAME MagicEnergyWaveMeshMaterial

precision mediump float;

uniform sampler2D map;

varying vec4 vUv;
varying float vOpacity;

void main() {

  vec4 sample = texture2D(map, vUv.xy);
  vec4 sample2 = texture2D(map, vUv.zw);

  vec4 finalColor = min(sample, sample2) * vec4(vec3(0.5, 1.8, 3.5), vOpacity);

  finalColor.rgb *= clamp(finalColor.a * 2.0, 0.0, 1.0);

  finalColor.a = clamp(clamp(finalColor.a, 0.0, 1.0) * vOpacity, 0.0, 1.0);
  
  // gl_FragColor = finalColor;
  gl_FragColor = clamp(finalColor, 0.0, 1.0);
  // gl_FragColor = clamp(finalColor, 0.0, 1.0);
}