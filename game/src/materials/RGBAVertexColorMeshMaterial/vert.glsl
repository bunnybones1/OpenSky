#define SHADER_NAME RGBAVertexColorMeshMaterial

precision highp float;

uniform float uOpacity;
attribute vec4 color;
#ifdef USE_2D_MODE
  attribute vec2 position;
  uniform float uAspectRatio;
#else
  attribute vec4 position;
#endif

uniform mat4 projectionMatrix;
uniform mat4 modelViewMatrix;

#ifdef USE_COLOR
  uniform vec3 uColor;
#endif
varying vec4 vColor;

void main() {
  #ifdef USE_2D_MODE
    gl_Position = projectionMatrix * modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
    gl_Position.xy += vec2(position.x / uAspectRatio, position.y) * modelViewMatrix[0][0];
  #else
    gl_Position = projectionMatrix * modelViewMatrix * position;
  #endif
  vColor = color;
  vColor.a *= uOpacity;
  #ifdef PREMULTIPLY_ALPHA
    vColor.rgb *= vColor.a;
  #endif
  #ifdef USE_COLOR
    vColor.rgb *= uColor;
  #endif
}