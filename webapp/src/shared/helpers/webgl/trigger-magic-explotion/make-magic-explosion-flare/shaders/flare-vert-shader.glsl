precision highp float;
attribute vec2 coordinates;
attribute vec4 colors;
varying vec4 vColors;
varying vec2 vUv;
uniform vec3 uTime;

void main(void) {
  gl_Position = vec4(coordinates, 0.0, 1.0);
  vUv = coordinates;
  vColors = colors;
  vColors.rgb = mix(vColors.rgb, COLOR, OPACITY);
  vColors *= uTime.x;
}