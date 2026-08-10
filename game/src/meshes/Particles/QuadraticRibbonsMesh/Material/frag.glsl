#define SHADER_NAME QuadraticRibbonsMaterial

precision lowp float;
#ifdef USE_COLOR_TEXTURE
uniform sampler2D colorTexture;
#endif

#if defined(USE_COLOR) && defined(USE_COLOR_OVER_OPACITY)
	uniform vec3 uColor;
	#ifdef USE_COLOR_END
		uniform vec3 uColorEnd;
	#endif
#endif

varying vec4 vColor;
varying vec4 vUv;

float cubicInOut(float t) {
  return t < 0.5
    ? 4.0 * t * t * t
    : 0.5 * pow(2.0 * t - 2.0, 3.0) + 1.0;
}

void main() {
	// texel.rgb *= vColor * vOpacity;
	// gl_FragColor = vec4(texel.rgb, 1.0);
	float cutoff = (1.0 - 2.0 * max(abs(vUv.z-0.5), abs(vUv.w-0.5))) * 2.0;
	gl_FragColor = vec4(vColor.rgb, vColor.a * cutoff);
	#ifdef USE_COLOR_TEXTURE
	vec4 texel = vec4(1.0) - texture2D(colorTexture, vUv.xy);
	gl_FragColor *= texel;
	#endif

	#if defined(USE_COLOR) && defined(USE_COLOR_OVER_OPACITY)
		#if defined(USE_COLOR_END)
			gl_FragColor.rgb *= mix(uColorEnd, uColor, gl_FragColor.a);
		#else
			gl_FragColor.rgb *= uColor;
		#endif
	#endif
	#ifdef PREMULTIPLY_ALPHA
		gl_FragColor.rgb *= gl_FragColor.a;
	#endif
	// float s = 1.0 - abs(vUv.z - vUv.w) * 2.0;
	// gl_FragColor = vec4(vec3(s) * vColor, 1.0);
}
