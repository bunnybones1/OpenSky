#define SHADER_NAME ShinePointMaterial

precision lowp float;
varying vec3 vColor;
void main() {
	float b = 1.0 - (abs(gl_PointCoord.x * 2.0 - 1.0) + abs(gl_PointCoord.y * 2.0 - 1.0));
	gl_FragColor = vec4(vColor * b, 1.0);
}
