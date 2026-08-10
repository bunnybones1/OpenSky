precision lowp float;
#ifdef USE_CUSTOM_COLOR
  uniform vec3 color;
#else 
  const vec3 color = vec3(0.2, 0.15, 0.04);
#endif
void main() {
  gl_FragColor = vec4(color, 1.0);
}
