#define SHADER_NAME ContactShadowMeshMaterial

precision highp float;

uniform float uOpacity;
uniform float uStrength;
attribute vec4 position;

uniform mat4 projectionMatrix;
uniform mat4 modelViewMatrix;

varying float vAlpha;

void main() {
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position.x, 0.0, position.z, 1.0);
  float fullShadow = (1.0 - position.y * -10.0);
  float shadowStrength = (1.0 - (1.0 - fullShadow) * (mix(1.0, 10.0, uStrength))) * uStrength;
  // vGradient = 1.0 - abs(position.x * 15.0);
  vAlpha = mix(0.0, 0.6, shadowStrength);
}

