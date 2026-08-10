#define SHADER_NAME BasicMapMeshMaterial
precision lowp float;
uniform sampler2D mapTexture;

#ifdef USE_OPACITY
  uniform float opacity;
#endif

#ifdef USE_OVERLAY_COLOR
  uniform vec3 uOverlayColor;
#endif

varying vec2 vUv;

void main() {
  gl_FragColor = texture2D(mapTexture, vUv);
  
  #ifdef ALPHA_TEST
    if(gl_FragColor.a < ALPHA_TEST) {
      discard;
    }
  #endif
  
  #ifdef USE_OVERLAY_COLOR
    vec3 x = gl_FragColor.rgb;
    vec3 m = uOverlayColor;
    vec3 colorIn = x * m;
    vec3 colorOut = (1.0 - x) * (m - 1.0) + 1.0;
  
    gl_FragColor.rgb = x * colorOut + (1.0 - x) * colorIn;
  #endif

  #ifdef USE_OPACITY
    gl_FragColor.a *= opacity;
  #endif
    // gl_FragColor.a = 0.7;


  // gl_FragColor = vec4(1.0, 1.0, 1.0, texture2D(mapTexture, vUv).a);
}
