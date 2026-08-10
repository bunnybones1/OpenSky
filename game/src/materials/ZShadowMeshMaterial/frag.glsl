#define SHADER_NAME ZShadowMeshMaterial
precision lowp float;
varying float vAlpha;
void main() {
  gl_FragColor = vec4(0.0, 0.0, 0.0, vAlpha);
}
