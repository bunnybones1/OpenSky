precision highp float;
attribute float size;
uniform float devicePixelRatio;

void main() {
	#include <begin_vertex>
	#include <project_vertex>
	gl_PointSize = (size / - mvPosition.z) * devicePixelRatio;
}
