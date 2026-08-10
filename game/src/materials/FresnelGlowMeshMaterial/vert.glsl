precision highp float;
#define SHADER_NAME FresnelGlowMeshMaterial

attribute vec4 position;
attribute vec3 normal;

uniform vec3 uColorSideFacing;
uniform vec3 uColorFrontFacing;

uniform mat3 normalMatrix;
uniform mat4 projectionMatrix;
uniform mat4 modelViewMatrix;

varying vec3 vColor;

#ifdef USE_FINAL_COLOR_SCALE
  uniform vec3 uFinalColorScale;
#endif

void main() {
  gl_Position = projectionMatrix * (modelViewMatrix * position);
  float viewNormalZ = normalize( normalMatrix * normal ).z;
  vColor = mix(uColorSideFacing, uColorFrontFacing, viewNormalZ * viewNormalZ * viewNormalZ * viewNormalZ);
  #ifdef USE_FINAL_COLOR_SCALE
    vColor *= uFinalColorScale;
  #endif
}