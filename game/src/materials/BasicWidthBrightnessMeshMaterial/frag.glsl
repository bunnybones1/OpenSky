#define SHADER_NAME BasicWidthBrightnessMeshMaterial
precision lowp float;
varying vec4 vColor;

void main() {
  gl_FragColor = vColor;
}