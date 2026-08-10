precision highp float;

attribute vec2 uv;
attribute vec4 offsetData;

uniform vec3 positionsX;
uniform vec3 positionsY;
uniform vec3 normalsX;
uniform vec3 normalsY;
uniform vec4 clipSpacePosition;
uniform vec2 pixelSizeInClipSpace;
uniform vec2 halfThicknesses;
uniform vec3 opacities;
uniform vec2 progress;
uniform float prescale;
varying vec2 vUv;
varying vec2 vOpacity;

void main() {
  vUv = uv;
	int index = int(offsetData.w);
	vec2 offset = vec2(positionsX[index], positionsY[index]);
	vec2 normal = vec2(normalsX[index], normalsY[index]);
	offset += normal * halfThicknesses[int(offsetData.x)] * offsetData.y;
	#ifdef CONSTANT_SIZE_ON_SCREEN
		offset *= pixelSizeInClipSpace * clipSpacePosition.w;
	#else
		offset *= pixelSizeInClipSpace;
	#endif
	vOpacity = vec2((uv.x - progress.x) * progress.y, opacities[int(offsetData.z)]);
  gl_Position = clipSpacePosition;
	gl_Position.xy += offset * prescale;
}
