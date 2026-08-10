precision lowp float;
varying vec3 vColor;
varying vec3 vColorTR;
varying vec3 vColorBL;
varying vec3 vColorBR;
void main() {
	vec3 topColor = mix(vColor, vColorTR, gl_PointCoord.x);
	vec3 bottomColor = mix(vColorBL, vColorBR, gl_PointCoord.x);
	vec3 color = mix(topColor, bottomColor, gl_PointCoord.y);
	gl_FragColor = vec4(color, 1.0);
}
