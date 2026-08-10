#define SHADER_NAME ManaVialMeshMaterial
precision highp float;

attribute vec2 uv;
attribute vec2 uv2;
attribute vec4 position;

uniform highp mat4 modelViewMatrix;
uniform float uDepth;
uniform float distortionYScale;

varying vec2 vUvEmpty;
varying vec2 vUvFull;
varying float vDistortionY;

void main() {
  vec2 sizeScale = vec2(modelViewMatrix[0][0], -modelViewMatrix[0][1]);
  vec2 sizeTranslate = vec2(modelViewMatrix[0][2], modelViewMatrix[0][3]);

  vec2 pos = position.xy * sizeScale * vec2(1.0, -1.0) + sizeTranslate;
  gl_Position = vec4(pos, uDepth, 1.0);

  vUvEmpty = uv;

  vUvFull = vec2(uv.x + 0.5, uv.y);
  
  vDistortionY = (uv.y - uv2.y) * distortionYScale;
}