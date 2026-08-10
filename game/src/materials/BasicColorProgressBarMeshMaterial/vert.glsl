precision highp float;
#define SHADER_NAME BasicColorMeshMaterial

attribute vec4 position;
attribute vec2 uv;

uniform mat4 projectionMatrix;
uniform mat4 modelViewMatrix;

varying float vU;

void main() {
  gl_Position = projectionMatrix * (modelViewMatrix * position);
  vU = uv.x;
}