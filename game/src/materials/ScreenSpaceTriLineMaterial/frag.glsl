precision mediump float;

varying vec2 vOpacity;
uniform vec3 color;

void main() {
  float opacity = clamp(vOpacity.x, 0.0, 1.0) * vOpacity.y;
  gl_FragColor = vec4(color * opacity, opacity * 0.5);
}

