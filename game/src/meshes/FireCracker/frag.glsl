#define SHADER_NAME FireCrackerMaterial

precision highp float;
uniform sampler2D mapTexture;
uniform float opacity;
uniform vec3 color;

void main() {
	vec4 texel = texture2D(mapTexture, gl_PointCoord);
	texel.rgb *= color;
	texel = max(vec4(0.0), texel - (1.0 - opacity));
	gl_FragColor = texel;
}
