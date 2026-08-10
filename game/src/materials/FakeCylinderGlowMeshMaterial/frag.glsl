precision lowp float;
#define SHADER_NAME FakeCylinderGlowMeshMaterial
uniform vec3 uColor;

varying float vOpacity;

void main() {
  gl_FragColor = vec4(uColor * vOpacity, vOpacity);
}
