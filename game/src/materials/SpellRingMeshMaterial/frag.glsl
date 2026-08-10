#define SHADER_NAME SpellRingMeshMaterial
precision mediump float;

varying vec2 vUv;

uniform vec3 color;
uniform float opacity;

void main() {
	float o = opacity * (sin(vUv.x) - 0.2) * vUv.y * 4.0;
	vec4 finalColor = vec4(color * clamp(o, 0.0, 1.0), o - 0.3);
  gl_FragColor = clamp(finalColor, 0.0, 1.0);
  // gl_FragColor = clamp(finalColor, 0.0, 1.0);
}