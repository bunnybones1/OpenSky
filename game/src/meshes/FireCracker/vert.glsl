#define SHADER_NAME FireCrackerMaterial

precision highp float;

uniform mat4 projectionMatrix;
uniform mat4 modelViewMatrix;
uniform float uDepth;

attribute vec4 positions;
attribute float size;
attribute float speed;
uniform float devicePixelRatio;
uniform float progress;

#define STROBE_FACTOR 200.0

float prng(float x) {
	return fract(sin(x) * 43758.5453);
}

float noise(float x) {
	float i = floor(x);
	float f = fract(x);
	float g = smoothstep(0.0, 1.0, f);

	return mix(prng(i), prng(i + 1.0), g);
}

void main() {
	float p = max(0.0, progress + speed * 0.1);
  vec2 handle = positions.xy;
	vec2 positionA = handle * p;
	vec2 positionB = mix(handle, positions.zw, p);
	vec2 position = mix(positionA, positionB, p);
	float sparkle = 1.0 - noise(sin(p * speed * STROBE_FACTOR));

	vec2 sizeScale = vec2(modelViewMatrix[0][0], -modelViewMatrix[0][1]);
	vec2 sizeTranslate = vec2(modelViewMatrix[0][2], modelViewMatrix[0][3]);
	vec2 preScale = vec2(modelViewMatrix[1][3], modelViewMatrix[2][3]);
	vec2 pos = position * sizeScale + sizeScale * vec2(0.5) + sizeTranslate;
	gl_Position = vec4(pos, uDepth, 1.0);
	
  // gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
	gl_PointSize = size * sparkle * devicePixelRatio * preScale.y;
}
