precision highp float;
uniform sampler2D mapTexture;
uniform vec4 uvTransform;

void main() {
	#ifdef TEST_OVERDRAW
	gl_FragColor = vec4(0.2, 0.2, 0, 1.0);
	#else
	vec2 uv = vec2(abs(gl_PointCoord.x * 2.0 - 1.0), abs(gl_PointCoord.y * 2.0 - 1.0));
	float u = clamp(uv.x + uv.y, 0.0, 1.0);
	uv = vec2(u * uvTransform.x + uvTransform.z, uvTransform.w);
	gl_FragColor = texture2D(mapTexture, uv);
	#endif
}
