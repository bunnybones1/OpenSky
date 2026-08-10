#define SHADER_NAME ContactShadowMeshMaterial
precision lowp float;
varying float vAlpha;

void main() {
  gl_FragColor = vec4(0.0, 0.0, 0.0, vAlpha);
}
