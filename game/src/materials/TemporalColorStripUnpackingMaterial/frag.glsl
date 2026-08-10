#define SHADER_NAME TemporalColorStripUnpackingMaterial
precision mediump float;
uniform sampler2D mapTexture;
varying vec4 uv_uv2;
varying float mixAmt;

#ifdef USE_INV_GAMMA_COLOR
  uniform vec3 invGammaColor;
#endif

void main() {
  vec4 colorA = texture2D(mapTexture, uv_uv2.xy);
  vec4 colorB = texture2D(mapTexture, uv_uv2.zw);
  gl_FragColor = mix(colorA, colorB, mixAmt);
  #ifdef USE_INV_GAMMA_COLOR
    gl_FragColor.rgb = pow(gl_FragColor.rgb, invGammaColor);
  #endif
}
