attribute vec2 uv;
attribute vec4 position;

uniform mat4 projectionMatrix;
uniform mat4 modelViewMatrix;

varying vec4 vColor;

uniform vec3 startColor;
uniform vec3 endColor;
uniform float startOpacity;
uniform float endOpacity;
uniform float opacity;

void main() {
  float o = mix(endOpacity, startOpacity, uv.y) * opacity;
  vec3 c = mix(endColor, startColor, uv.y);

  vColor = vec4(c, o);

  gl_Position = projectionMatrix * modelViewMatrix * position;
}