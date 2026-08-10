#define SHADER_NAME QuadraticRibbonsMaterial

precision highp float;

#ifdef USE_DISTORTION_TEXTURE
uniform sampler2D distortionTexture;
uniform float distortionStrength;
uniform float distortionScale;
#endif

#ifdef USE_SINE_WAVE
uniform vec2 uSineWaveScaleStrength;
#endif

#ifndef SHAPE_EASE 
	float shapeEase(in float v) {
		return v;
	}
#endif

#if defined(USE_COLOR) && defined(USE_COLOR_OVER_TIME)
	uniform lowp vec3 uColor;
	#ifdef USE_COLOR_END
		uniform lowp vec3 uColorEnd;
	#endif
#endif

uniform mat4 projectionMatrix;
uniform mat4 modelViewMatrix;
uniform float pixelAspectRatio;
uniform float relativeWidth;
uniform float fullLengthVerts;

attribute vec4 position;
attribute vec3 positionHandle;
attribute vec3 position2;
attribute vec2 uv;
attribute vec3 color;
attribute vec2 timeOffsets;
uniform float progress;
uniform float opacity;
uniform float strokePathFraction;
varying vec4 vColor;
varying vec4 vUv;


float wrap(float val, float min, float max) {
  float range = max - min;
  return mod(mod(val - min, range) + range, range) + min;
}

vec3 getBezierPosition(in float t, in vec3 p1, in vec3 pc, in vec3 p2) {
    float it = 1.0 - t;
    return it * it * p1 + 2.0 * it * t * pc + t * t * p2;
}

void main() {
	float fullLength = 1.0 + strokePathFraction; 
	// #ifdef TIME_EASE
	// 	float relativeTime = timeEase(max(0.0, min(1.0, wrap(progress - timeOffsets.y, -2.0, 2.0))));
	// #else
	float relativeTime = wrap(progress - timeOffsets.y, -2.0, 2.0);
	// #endif
	#ifdef TIME_EASE
		relativeTime = timeEase(max(0.0, min(1.0, relativeTime)));
	#endif
	#ifdef USE_TIME_REWIND
		relativeTime = (1.0 - pow(abs(relativeTime * 2.0 - 1.0), 2.0)) * 0.5;
	#endif

	#ifdef PROGRESS_LOCK
		float origRelativeTime = relativeTime;
		relativeTime = PROGRESS_LOCK;
	#endif
	float u = (timeOffsets.x - 1.0) * strokePathFraction + relativeTime * fullLength;
	float pDistanceBetweenSegments = 1.0 / fullLengthVerts;
	float fullLengthVertsPlusOne = fullLengthVerts - 1.0;
	#ifdef QUANTIZE_TIME
		float t = u;
		if(uv.x != uv.y) {
			t = u - fract(u * fullLengthVertsPlusOne) / fullLengthVertsPlusOne;
		} else if(uv.x == 0.0) {
			t -= pDistanceBetweenSegments * 0.5;
		}
	#else
		float t = u;
	#endif
	float p = min(1.0, max(0.0, t));
	// float p = t;
	vec3 positionFinal = getBezierPosition(p, position.xyz, positionHandle, position2);
	// positionFinal.x += p*p*p*p * 0.1; //cheap wind but better to bake this into the geometry/position2
	vec3 positionBehind = getBezierPosition(p - pDistanceBetweenSegments, position.xyz, positionHandle, position2);
	vec3 positionAhead = getBezierPosition(p + pDistanceBetweenSegments, position.xyz, positionHandle, position2);

	#ifdef USE_DISTORTION_TEXTURE
		// float to = 0.0;
		float to = timeOffsets.y * 0.25;
		
		#if defined(TAPER_DISTORTION_IN)
			float myDistortionStrength = distortionStrength * p;
		#elif defined(TAPER_DISTORTION_OUT)
			float myDistortionStrength = distortionStrength * (1.0-p);
		#elif defined(TAPER_DISTORTION_IN_OUT)
			float myDistortionStrength = distortionStrength * (1.0-p) * p * 4.0;
		#else
			float myDistortionStrength = distortionStrength;
		#endif

		vec4 texelBehind = texture2D(distortionTexture, positionBehind.xy * distortionScale + to);
		vec4 texel = texture2D(distortionTexture, positionFinal.xy * distortionScale + to);
		vec4 texelAhead = texture2D(distortionTexture, positionAhead.xy * distortionScale + to);
		positionBehind += myDistortionStrength * (texelBehind.xyz - 0.5);
		positionFinal += myDistortionStrength * (texel.xyz - 0.5);
		positionAhead += myDistortionStrength * (texelAhead.xyz - 0.5);
	#endif

	#ifndef USE_2D_MODE
		mat4 finalMatrix = projectionMatrix * modelViewMatrix;
	#endif
	
	#ifdef USE_2D_MODE
		vec4 clipSpaceBehindPosition = vec4(positionBehind, 1.0); 
	#else 
		vec4 clipSpaceBehindPosition = finalMatrix * vec4(positionBehind, 1.0); 
	#endif

	vec2 screenSpaceBehindPosition = clipSpaceBehindPosition.xy / clipSpaceBehindPosition.w;
	screenSpaceBehindPosition.y /= pixelAspectRatio;

	#ifdef USE_2D_MODE
		gl_Position = vec4(positionFinal.xy, 0.0, 1.0);
	#else 
		gl_Position = finalMatrix * vec4(positionFinal, 1.0);
	#endif

	vec2 screenSpacePosition = gl_Position.xy / gl_Position.w;
	screenSpacePosition.y /= pixelAspectRatio;

	#ifdef USE_2D_MODE
		vec4 clipSpaceAheadPosition = vec4(positionAhead.xy, 0.0, 1.0); 
	#else
		vec4 clipSpaceAheadPosition = finalMatrix * vec4(positionAhead, 1.0); 
	#endif
	
	vec2 screenSpaceAheadPosition = clipSpaceAheadPosition.xy / clipSpaceAheadPosition.w;
	screenSpaceAheadPosition.y /= pixelAspectRatio;

	vec2 screenSpaceNormalAhead = normalize(screenSpaceAheadPosition - screenSpacePosition);
	vec2 screenSpaceNormalBehind = normalize(screenSpacePosition - screenSpaceBehindPosition);
	vec2 screenSpaceNormal = screenSpaceNormalAhead;//normalize(screenSpaceNormalAhead + screenSpaceNormalBehind);
	// screenSpaceNormal = vec2(1.0, 0.0);

	float timeToEase = timeOffsets.x;
	#ifdef QUANTIZE_TIME
		timeToEase -= (u-t) / strokePathFraction;
	#endif

	// float easedStep = shapeEase(timeToEase);
	float easedStep = shapeEase(timeOffsets.x);
	#ifdef TAPER_RIBBON_OUT
		float widthPercent = easedStep * (1.0-timeToEase);
	#else
		float widthPercent = easedStep;
	#endif

	vec2 perpendicular = vec2(-screenSpaceNormal.y, screenSpaceNormal.x);
	gl_Position.xy += perpendicular * widthPercent * position.w * relativeWidth;
	#ifdef USE_SINE_WAVE
	//12.556 = PI * 4
	//6.283 = PI * 2
		gl_Position.xy += perpendicular * sin(p * uSineWaveScaleStrength.x + progress * 6.283) * uSineWaveScaleStrength.y;
	#endif
	gl_Position /= max(0.1, widthPercent);
	float strength = (1.0 - pow(abs(p-0.5) * 2.0, 8.0));
	vColor = vec4(color, strength * opacity);
	#ifdef PROGRESS_LOCK
		vColor.a *= origRelativeTime;
	#endif
	#if defined(USE_COLOR) && defined(USE_COLOR_OVER_TIME)
		#if defined(USE_COLOR_END)
			vColor.rgb *= mix(uColor, uColorEnd, t);
		#else
			vColor.rgb *= uColor;
		#endif
	#endif
	vUv = vec4(uv, step(vec2(0.5), uv));
	
	#ifdef USE_DISTORTION_TEXTURE
	// vColor = texel.rgb;
	#endif
}
