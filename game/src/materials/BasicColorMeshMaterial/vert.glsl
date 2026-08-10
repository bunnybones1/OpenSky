precision highp float;
#define SHADER_NAME BasicColorMeshMaterial

attribute vec4 position;

uniform mat4 projectionMatrix;
uniform mat4 modelViewMatrix;

void main() {
  gl_Position = projectionMatrix * (modelViewMatrix * position);
}