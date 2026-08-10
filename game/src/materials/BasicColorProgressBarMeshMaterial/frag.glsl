precision lowp float;
#define SHADER_NAME BasicColorMeshMaterial

uniform vec3 color;
uniform float opacity;
uniform float progress;

varying float vU;

void main() {
  gl_FragColor = vec4(color * step(vU, progress), opacity);
}
