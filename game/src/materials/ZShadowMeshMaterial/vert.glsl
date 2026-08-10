#define SHADER_NAME ZShadowMeshMaterial

precision highp float;

uniform float uZScale;
uniform float uOpacity;
attribute vec4 position;

uniform mat4 projectionMatrix;
uniform mat4 modelViewMatrix;

varying float vAlpha;


void main() {
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position.x, 0.0, position.z, 1.0);
  vAlpha = position.y * uZScale * uOpacity;
}