#define SHADER_NAME NormalMappedRayCastCylinderCascadeMaterial

precision highp float;

attribute vec2 uv;
attribute vec3 position;

uniform mat4 projectionMatrix;
uniform mat4 modelMatrix;
uniform mat4 viewMatrix;


uniform float scrollAmount;
uniform float cloudsOffsetX;
uniform float cloudsWidth;
uniform vec2 uZW;

varying vec2 vUv;
//varying float vNormalTweak;

void main() {
  gl_Position = vec4(position.xy*uZW.y, uZW.x, uZW.y);
  vUv = uv;
  vUv.x += scrollAmount;
  //vNormalTweak = curve * -direction * 0.7;
}