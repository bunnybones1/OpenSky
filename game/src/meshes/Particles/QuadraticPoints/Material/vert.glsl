#define SHADER_NAME QuadraticPointsMaterial

precision highp float;

#ifdef USE_DISTORTION_TEXTURE
	uniform sampler2D distortionTexture;
	uniform float distortionStrength;
	uniform float distortionScale;
#endif

uniform mat4 projectionMatrix;
uniform mat4 modelViewMatrix;

attribute vec3 position;
attribute vec3 positionHandle;
attribute vec3 position2;
attribute vec3 color;
attribute float size;
attribute float timeOffset;
uniform float devicePixelRatio;
uniform float opacity;
uniform float time;
varying vec4 vColor;

#ifdef USE_SPRITESHEET
	uniform lowp float spriteSheetSegments;
	uniform lowp float spriteSheetSpeed;
	varying lowp vec2 vSpriteSheetOffset;
	#if defined(FLIP_X) || defined(FLIP_Y)
		varying lowp vec2 vSpriteSheetFlip;
	#endif
#endif

float wrap(float val, float min, float max) {
  float range = max - min;
  return mod(mod(val - min, range) + range, range) + min;
}

void main() {
	float t = wrap(time - timeOffset, -2.0, 2.0);
	float p = min(1.0, max(0.0, t));
	vec3 positionA = mix(position, positionHandle, p);
	vec3 positionB = mix(positionHandle, position2, p);
	vec3 positionFinal = mix(positionA, positionB, p);
	
	#ifdef USE_DISTORTION_TEXTURE
		// float to = 0.0;
		float to = time * 0.25;
		#if defined(TAPER_DISTORTION_IN)
			float myDistortionStrength = distortionStrength * p;
		#elif defined(TAPER_DISTORTION_OUT)
			float myDistortionStrength = distortionStrength * (1.0-p);
		#elif defined(TAPER_DISTORTION_IN_OUT)
			float myDistortionStrength = distortionStrength * (1.0-p) * p * 4.0;
		#else
			float myDistortionStrength = distortionStrength;
		#endif
		vec4 texel = texture2D(distortionTexture, positionFinal.xy * distortionScale + to);
		positionFinal += myDistortionStrength * (texel.xyz - 0.5);
	#endif

	#ifdef USE_2D_MODE
		gl_Position = vec4(positionFinal.xy, 0.0, 1.0);
	#else 
		vec4 mvPosition = modelViewMatrix * vec4(positionFinal, 1.0);
		gl_Position = projectionMatrix * mvPosition;
	#endif

	float visible = step(abs(t - 0.5), 0.4999);
	gl_Position.y += (1.0-visible) * 10.0;
	gl_PointSize = visible * size * devicePixelRatio;
	#ifdef USE_PERSPECTIVE_SCALE
		gl_PointSize /= -mvPosition.z;
	#endif
	vColor = vec4(color, opacity);
	#if defined(EASE_SIZE) || defined(EASE_OPACITY)
		float strength = 1.0 - pow(abs(p-0.5) * 2.0, 8.0);
		#if defined(EASE_SIZE)
			gl_PointSize *= strength;
		#elif defined(EASE_OPACITY)
			vColor.a *= strength;
		#endif
	#endif
	
	#ifdef USE_DISSIPATE
		gl_PointSize *= 1.0 + t;
		vColor.a *= 1.0 - t;
	#endif

	#ifdef USE_SPRITESHEET
		float totalFrames = spriteSheetSegments * spriteSheetSegments;
		float sTime = mod(fract(positionHandle.x * 100.0) + p * spriteSheetSpeed, 1.0);
		float colIndex = mod(floor(sTime * spriteSheetSegments * spriteSheetSegments), spriteSheetSegments);
		float rowIndex = floor(sTime * spriteSheetSegments);
		vSpriteSheetOffset = vec2(colIndex, rowIndex);
		#if defined(FLIP_X) && defined(FLIP_Y)
			vSpriteSheetFlip = vec2(step(mod(positionHandle.x, 0.1), 0.05), step(mod(positionHandle.z, 0.1), 0.05));
		#elif defined(FLIP_X)
			vSpriteSheetFlip = vec2(step(mod(positionHandle.x, 0.1), 0.05), 0.0);
		#elif defined(FLIP_Y)
			vSpriteSheetFlip = vec2(0.0, step(mod(positionHandle.z, 0.1), 0.05));
		#endif

	#endif
}
