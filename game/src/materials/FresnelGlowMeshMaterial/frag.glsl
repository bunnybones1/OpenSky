precision lowp float;
#define SHADER_NAME FresnelGlowMeshMaterial

varying vec3 vColor;

void main() {
  gl_FragColor = vec4(vColor, 1.0);
}
