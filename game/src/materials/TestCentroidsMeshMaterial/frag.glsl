#define SHADER_NAME TestCentroidsMeshMaterial
precision lowp float;

uniform vec3 uColor;

varying vec3 vColor;

void main() {
  gl_FragColor = vec4(mix(vec3(0.6, 0.7, 0.8), vec3(0.05, 0.1, 0.2), 1.0-vColor.r), 1.0);
}
