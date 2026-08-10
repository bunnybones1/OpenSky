#define SHADER_NAME PortalMeshMaterial

precision mediump float;

uniform sampler2D map;
uniform vec4 colorScale;
uniform vec4 colorOffset;

uniform vec4 colorBottomScale;
uniform vec4 colorBottomOffset;

varying vec4 vUv;
varying float vOpacity;

varying float topBottom;

void main() {

  vec4 sample = texture2D(map, vUv.xy).rrra;
  vec4 sample2 = texture2D(map, vUv.zw).ggga;

  #ifdef USE_INNER_DETAILS
    float opacity = (-abs(vOpacity-0.65) + 0.65) * 1.2;
  #else
    float opacity = vOpacity;
  #endif
  float brightness = (sample.r + sample2.r) * opacity;
  float alpha = ((min(sample.a, sample2.a) * opacity + (opacity + brightness) * 0.25) * 5.0 - 1.5);

  #ifdef USE_INNER_DETAILS
    vec4 color = vec4(vec3(brightness), alpha);
  #else
    vec4 color = vec4(vec3(0.0), alpha);
  #endif

  gl_FragColor = color * mix(colorScale, colorBottomScale, topBottom) + mix(colorOffset, colorBottomOffset, topBottom);

  gl_FragColor.rgb *= clamp(alpha * 0.2 + 0.2, 0.0, 1.0);
  // gl_FragColor = vec4(0.35, 0.65, 1.8, 1.0);

  
}