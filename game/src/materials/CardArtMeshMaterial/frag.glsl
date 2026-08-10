precision highp float;

uniform sampler2D uFgTexture;
uniform sampler2D uBgTexture;
#ifdef USE_FOIL
	uniform float uFoilRGBSplit;
	uniform vec3 uFoilAnimTime;
    varying vec2 vFoilBandPhase;
	uniform vec3 uFoilOnArtOnly;
	uniform vec3 uMetalColor;
	uniform float uMetalColorStrength;
	uniform vec3 uGlintColor;
#endif

varying vec4 vColor;
varying vec3 vPretintBgMaskFgMask;
varying vec4 vUvs;
varying float vFGDepth;

#ifdef USE_STEALTH_EFFECT
	//hex modulation based on https://www.shadertoy.com/view/ll3yW7 by laserdog
	const vec2 s = vec2(1, 1.7320508); // 1.7320508 = sqrt(3)
	vec4 calcHexInfo(vec2 uv)
	{
		vec4 hexCenter = floor(vec4(uv, uv - vec2(.5, 1.)) / s.xyxy + 0.5);
		vec4 offset = vec4(uv - hexCenter.xy * s, uv - (hexCenter.zw + .5) * s);
		return dot(offset.xy, offset.xy) < dot(offset.zw, offset.zw) ? vec4(offset.xy, hexCenter.xy) : vec4(offset.zw, hexCenter.zw);
	}

	uniform vec3 uWaveTime;
	uniform vec3 uStealthEffectSettings; //uStealthEffectSettings.xyz = fgDistortionStrength, fgTransparencyFloor, fgTransparency
#endif

#ifdef USE_COLOR_MATRIX_FG
	uniform mat4 uColorMatrixFg;	
#endif
#ifdef USE_COLOR_MATRIX
	uniform mat4 uColorMatrix;	
#endif

void main() {
	vec2 uvsFg = vUvs.xy;
	#ifdef USE_STEALTH_EFFECT
		vec2 drift = vec2(uWaveTime.z, uWaveTime.z * s.y * 0.25);
		vec2 drift2 = drift * -4.6;

		vec2 tiles = vec2(8.0, 8.0);
		vec2 recenter = vec2(4.0, 1.0);
		vec2 bulged = vec2(-0.5 * ((pow(1.0-vUvs.x, 4.0) - pow(vUvs.x, 4.0)) + 0.5), vUvs.y);
		vec4 hexInfo = calcHexInfo((bulged + drift) * tiles);
		vec2 d2 = (hexInfo.zw - recenter + drift2) * vec2(0.25, 1.0);
		float d = length(d2);
		d *= d * 0.3;
		vec2 hexDelta = hexInfo.xy * max(0.2, d2.y) * uStealthEffectSettings.x;
		vec2 fixedUvsFg = uvsFg + hexDelta;
	#else
		vec2 fixedUvsFg = uvsFg;
	#endif
	vec4 texelFg;
	texelFg = texture2D(uFgTexture, fixedUvsFg);

	#ifdef USE_COLOR_MATRIX_FG
		texelFg.rgb = (uColorMatrixFg * vec4(texelFg.rgb, 1.0)).rgb;
	#endif
	
	vec2 outOfBounds = step(abs(fixedUvsFg - 0.5), vec2(0.5));
	texelFg.a = min(texelFg.a, vPretintBgMaskFgMask.z) * max(vFGDepth, (outOfBounds.x * outOfBounds.y));
	float originalFgAlpha = texelFg.a;

	if(max(vPretintBgMaskFgMask.y, texelFg.a) < 0.5) {
		discard;
	}

	#ifdef USE_STEALTH_EFFECT
		vec2 fixedUvsBg = vUvs.zw + ((mix(texelFg.rg, -texelFg.br, uWaveTime.xy) * 0.3) + hexInfo.xy * 0.25) * 0.4 * texelFg.a;
		// vec2 fixedUvsBg = vUvs.zw + ((texelFg.rg * 0.3) + hexInfo.xy * 0.25) * 0.4 * texelFg.a;
		texelFg.a *= min(1.0, max(uStealthEffectSettings.y, uStealthEffectSettings.z * (1.0-d2.y)));
	#else
		vec2 fixedUvsBg = vUvs.zw;
	#endif

	fixedUvsBg = 1.0 - abs(mod(fixedUvsBg, 2.0) - 1.0);
	vec4 texelBg = texture2D(uBgTexture, fixedUvsBg);
	#ifdef RENDER_STREAMER_FRAME
		gl_FragColor = vec4(mix(vec3(0.0, 0.0, 0.0), vColor.rgb, 1.0), 1.0);
		gl_FragColor.a = vPretintBgMaskFgMask.x;
	#else
		#ifdef USE_STEALTH_EFFECT
			vec3 rgb = mix(texelBg.rgb, texelFg.rgb, texelFg.a);
		#else
			vec3 rgb = mix(mix(texelFg.rgb, texelBg.rgb, vPretintBgMaskFgMask.y), texelFg.rgb, texelFg.a);
		#endif

		gl_FragColor = vec4(mix(rgb, vColor.rgb, vPretintBgMaskFgMask.x), 1.0);
	#endif

	#ifdef USE_FOIL
		float sat = max(gl_FragColor.r, max(gl_FragColor.g, gl_FragColor.b)) - min(gl_FragColor.r, min(gl_FragColor.g, gl_FragColor.b));
		// float av = vDelta.x * 3.0 + vDelta.y * 3.0;
		float phaseBasis = -(uFoilAnimTime.z * (step(0.5, max(vPretintBgMaskFgMask.x, originalFgAlpha)) * 2.0 - 1.0)) + vFoilBandPhase.x;
		float phase = mod(phaseBasis, 1.0) * 6.2832;
		float foilRGBSplit = uFoilRGBSplit * (1.0 - sat * 0.5);
		vec3 phase3 = vec3(phase, phase + foilRGBSplit, phase + 2.0 * foilRGBSplit);
		float artFGMask = min(1.0-vPretintBgMaskFgMask.x, originalFgAlpha) * uFoilOnArtOnly.x;
		float artBGMask = (1.0 - max(vPretintBgMaskFgMask.x, originalFgAlpha)) * uFoilOnArtOnly.y;
		float frameMask = vPretintBgMaskFgMask.x * uFoilOnArtOnly.z;

		float specEffect = sin(phase);
		float goldPhase = mod(vFoilBandPhase.y, 1.0) * 6.2832;
		float goldEffect = (sin(goldPhase) + 0.85) * mix(1.0, 0.5, vPretintBgMaskFgMask.x);
		vec3 foilEffect = (sin(phase3) * (artFGMask + artBGMask + frameMask)) * (1.0 + sat) - (uMetalColor * max(0.0, (1.0-vColor.a) * goldEffect)) * uMetalColorStrength;
		foilEffect *= mix(1.0, 0.5, vPretintBgMaskFgMask.x);
		vec3 foiled = pow(gl_FragColor.rgb, foilEffect + 1.0) - (foilEffect * 0.15);
		gl_FragColor.rgb = foiled;
		// gl_FragColor.rgb = mix(foiled, gl_FragColor.rgb, step(0.25, mod(fixedUvsFg.x, 0.5)));
		// gl_FragColor = breathingUv;
		// gl_FragColor.rgb = vec3(artFGMask, artBGMask, frameMask);

		// gl_FragColor.rgb = vec3(vColor.a * ((3.0 - 3.0 * (1.0-foilEffect)) + 0.5));
		gl_FragColor.rgb += vec3(max(0.0, vColor.a * (0.6 - 2.0 * (1.0 - specEffect)))) * uGlintColor * uMetalColorStrength;
		// gl_FragColor.rgb = vec3(foilEffect);

	#endif

	#ifdef USE_COLOR_MATRIX
		gl_FragColor.rgb = (uColorMatrix * vec4(gl_FragColor.rgb, 1.0)).rgb;
	#endif

}
