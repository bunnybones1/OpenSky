#define SHADER_NAME ScreenSpaceRingGlowingMaterial
precision highp float;

attribute vec2 uv;
attribute vec2 position;
attribute vec3 offsetData;

uniform float radius;
uniform float prescale;
uniform vec4 clipSpacePosition;
uniform vec2 pixelSizeInClipSpace;
uniform vec2 halfThicknesses;
uniform vec3 opacities;
uniform vec2 progress;
uniform vec3 color;
#ifdef USE_ROTATION2D
	uniform mat2 rotation2DMatrix;
#endif
varying vec4 vColor;


void main() {
	vec2 offset = position * radius;
	offset += position * halfThicknesses[int(offsetData.x)] * offsetData.y;
	#ifdef USE_ROTATION2D
		offset *= rotation2DMatrix;
	#endif
	#ifdef CONSTANT_SIZE_ON_SCREEN
		offset *= pixelSizeInClipSpace * clipSpacePosition.w;
	#else
		offset *= pixelSizeInClipSpace;
	#endif
	float opacity = clamp((0.25 - ((1.0 - uv.x) - progress.x)) * progress.y, 0.0, 1.0);
	opacity *= opacities[int(offsetData.z)];
	vColor = vec4(color * opacity, opacity * 0.5);	//premultiply black, but not fully
    gl_Position = clipSpacePosition;
	gl_Position.xy += offset * prescale;
}
