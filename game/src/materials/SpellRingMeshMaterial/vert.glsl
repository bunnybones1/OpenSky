#define SHADER_NAME SpellRingMeshMaterial
#define M_PI 3.1415926535897932384626433832795

attribute vec2 uv;
attribute vec4 position;

uniform mat4 projectionMatrix;
uniform mat4 modelViewMatrix;

uniform float time;

varying vec2 vUv;

void main() {
	vUv = vec2(((uv.y * 6.0 + time) * M_PI), uv.y);
  gl_Position = projectionMatrix * modelViewMatrix * position;
}