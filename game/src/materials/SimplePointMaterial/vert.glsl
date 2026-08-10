precision highp float;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;

attribute vec2 position;
uniform float size;
uniform float devicePixelRatio;
attribute vec3 color;
varying vec3 vColor;
attribute vec3 colorTR;
varying vec3 vColorTR;
attribute vec3 colorBL;
varying vec3 vColorBL;
attribute vec3 colorBR;
varying vec3 vColorBR;

void main() {
	gl_PointSize = size * devicePixelRatio;
	vColor = color;
	vColorTR = colorTR;
	vColorBL = colorBL;
	vColorBR = colorBR;
	// gl_Position = projectionMatrix * (modelViewMatrix * vec4(position, 0.0, 1.0));
	
	#ifdef USE_2D_MODE
		gl_Position = vec4(position.xy, 0.0, 1.0);
	#else 
		vec4 mvPosition = modelViewMatrix * vec4(position, 0.0, 1.0);
		gl_Position = projectionMatrix * mvPosition;
	#endif

}
