precision highp float;

uniform float time;

varying vec2 vUv;

const float SPEED = 50.0;

const float PI = 3.14159265358979;

float prng(float x) {
	return fract(sin(x) * 43758.5453);
}

float noise(float x) {
	float i = floor(x);
	float f = fract(x);
	float g = smoothstep(0.0, 1.0, f);

	return mix(prng(i), prng(i + 1.0), g);
}

float circle(vec2 center, vec2 coord, float rad) {
  float dist = distance(center, coord);
  return smoothstep(0.0, rad, dist);
}

void main() {
  float pulse = sin(time * PI);
  float radius = 0.15 + clamp(noise(pulse * SPEED), 0.0, 0.35);
  float circle = circle(vec2(0.5), vUv, radius);
  float opacity = 1.0 - clamp(circle, 0.0, 1.0);

  gl_FragColor = vec4(opacity * 0.3 + 0.3, 0.3, 0.0, opacity / 1.5);
}