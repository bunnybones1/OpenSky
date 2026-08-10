precision highp float;
varying vec3 vColors;

void main(void) {
  //a cheap approximation of a circle
  vec2 dist2 = abs(gl_PointCoord - vec2(0.5)) * 2.0;
  dist2 = vec2(1.0) - dist2;
  float dist = dist2.x * dist2.y;
  gl_FragColor = vec4(vColors * 1.732050807568877, dist * 4.0);
}