precision highp float;
#define SHADER_NAME FakeCylinderGlowMeshMaterial

attribute vec4 position;
attribute vec4 position2;

uniform float uOpacity;

uniform mat4 projectionMatrix;
uniform mat4 modelViewMatrix;

varying float vOpacity;

uniform float uSideness;

void main() {
  gl_Position = projectionMatrix * (modelViewMatrix * vec4(position.xz + position2.xz * uSideness, 0.0, 1.0));
  vOpacity = uOpacity * position.y;
}