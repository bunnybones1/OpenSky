#define SHADER_NAME QuadraticRibbonMaterial

precision lowp float;

uniform vec4 uColor;

#ifdef USE_COLOR2
varying float vRatio;
uniform vec4 uColor2;
#endif
#ifdef USE_TEXTURE
uniform sampler2D uTexture;
varying vec2 vEdge;
varying vec4 vUv2;
#endif

void main() {
	#ifdef USE_COLOR2
	gl_FragColor = mix(uColor, uColor2, vRatio);
	#else
	gl_FragColor = uColor;
	#endif

	#ifdef USE_TEXTURE
	vec4 sample = texture2D(uTexture, vUv2.xy);
	vec4 sample2 = texture2D(uTexture, vUv2.zw);
	vec4 finalColor = min(sample, sample2);

	gl_FragColor *= finalColor;
	gl_FragColor *= 1.0 - abs(vEdge.y);
	#endif
}
