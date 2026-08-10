#define SHADER_NAME QuadraticRibbonMaterial

precision highp float;

uniform mat4 projectionMatrix;
uniform mat4 modelViewMatrix;
uniform vec3 uPositionStart;
uniform vec3 uPositionHandle;
uniform vec3 uPositionEnd;
uniform float uPixelAspectRatio;
uniform float uRelativeWidth;

attribute vec2 ratioSide;

#ifdef USE_COLOR2
varying float vRatio;
#endif

#ifdef USE_TEXTURE
uniform vec2 uUniqueness;
uniform vec2 uTime2;
varying vec2 vEdge;
varying vec4 vUv2;
#endif

vec3 getBezierPosition(in float t, in vec3 p1, in vec3 pc, in vec3 p2) {
	float it = 1.0 - t;
	return it * it * p1 + 2.0 * it * t * pc + t * t * p2;
}

void main() {
	// float p = t;
	vec3 positionFinal = getBezierPosition(ratioSide.x, uPositionStart, uPositionHandle, uPositionEnd);
	// positionFinal.x += p*p*p*p * 0.1; //cheap wind but better to bake this into the geometry/position2
	// vec3 positionBehind = getBezierPosition(ratioSide.x - 0.05, uPositionStart, uPositionHandle, uPositionEnd);
	vec3 positionAhead = getBezierPosition(ratioSide.x + 0.05, uPositionStart, uPositionHandle, uPositionEnd);

	mat4 finalMatrix = projectionMatrix * modelViewMatrix;

	// vec4 clipSpaceBehindPosition = finalMatrix * vec4(positionBehind, 1.0); 

	// vec2 screenSpaceBehindPosition = clipSpaceBehindPosition.xy / clipSpaceBehindPosition.w;
	// screenSpaceBehindPosition.y /= uPixelAspectRatio;

	gl_Position = finalMatrix * vec4(positionFinal, 1.0);

	vec2 screenSpacePosition = gl_Position.xy / gl_Position.w;
	screenSpacePosition.y /= uPixelAspectRatio;

	vec4 clipSpaceAheadPosition = finalMatrix * vec4(positionAhead, 1.0);

	vec2 screenSpaceAheadPosition = clipSpaceAheadPosition.xy / clipSpaceAheadPosition.w;
	screenSpaceAheadPosition.y /= uPixelAspectRatio;

	vec2 screenSpaceNormalAhead = normalize(screenSpaceAheadPosition - screenSpacePosition);
	// vec2 screenSpaceNormalBehind = normalize(screenSpacePosition - screenSpaceBehindPosition);
	// vec2 screenSpaceNormal = screenSpaceNormalAhead;//normalize(screenSpaceNormalAhead + screenSpaceNormalBehind);
	// screenSpaceNormal = vec2(1.0, 0.0);

	vec2 perpendicular = vec2(-screenSpaceNormalAhead.y, screenSpaceNormalAhead.x);
	gl_Position.xy += perpendicular * ratioSide.y * uRelativeWidth;
	gl_Position /= max(0.0001, abs(ratioSide.y));

	#ifdef USE_COLOR2
	vRatio = ratioSide.x;
	#endif

	#ifdef USE_TEXTURE
	vec2 uvRaw = vec2(-ratioSide.x, sign(ratioSide.y));
	vec2 uvRawCompensated = vec2(uvRaw.x, uvRaw.y * uRelativeWidth * 20.0);
	vec2 uv1 = uvRawCompensated + uTime2 + uUniqueness;
	vec2 uv2 = uvRawCompensated + vec2(uTime2.x, -uTime2.y);

	vEdge = uvRaw;
	vUv2 = vec4(uv1, uv2);
	#endif
}
