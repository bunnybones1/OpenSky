#define SHADER_NAME QuadraticPointsMaterial

precision lowp float;
uniform sampler2D colorTexture;
varying vec4 vColor;
#ifdef USE_SPRITESHEET
	uniform float spriteSheetSegments;
	varying vec2 vSpriteSheetOffset;
	#if defined(FLIP_X) || defined(FLIP_Y)
		varying vec2 vSpriteSheetFlip;
	#endif
#endif

#ifdef USE_LIGHT_COLORS
	uniform vec3 colorLightTop;
	uniform vec3 colorLightBottom;
#endif

#ifdef USE_ALPHA_TEST
	uniform float alphaTest;
#endif

void main() {

	#ifdef USE_SPRITESHEET
		#if defined(FLIP_X) || defined(FLIP_Y)
			vec2 uv = (mix(gl_PointCoord, (1.0-gl_PointCoord), vSpriteSheetFlip) + vSpriteSheetOffset) / spriteSheetSegments;
		#else
			vec2 uv = (gl_PointCoord + vSpriteSheetOffset) / spriteSheetSegments;
		#endif
		vec4 texel = texture2D(colorTexture, uv);
	#else
		vec4 texel = texture2D(colorTexture, gl_PointCoord);
	#endif

	#ifdef ALPHA_FROM_TEXEL_RED
		texel.a = texel.r;
	#endif

	#ifdef USE_ALPHA_TEST
		if(texel.a < alphaTest) {
			discard;
		}
	#endif
	
	#ifdef USE_LIGHT_COLORS
		texel.rgb = mix(colorLightBottom, colorLightTop, texel.g);
	#endif
	gl_FragColor = texel * vColor;

	#ifdef PREMULTIPLY_ALPHA
		gl_FragColor.rgb *= gl_FragColor.a;
	#endif
}
