#define SHADER_NAME BasicVertexColorMeshMaterial
precision lowp float;
#ifdef COLOR_ATTRIBUTE
  varying vec4 vColor;
#else
  uniform vec3 uColor;
  uniform float uOpacity;
#endif

void main() {
  #ifdef COLOR_ATTRIBUTE
    gl_FragColor = vColor;
  #else
    gl_FragColor = vec4(uColor, uOpacity);
  #endif
}
