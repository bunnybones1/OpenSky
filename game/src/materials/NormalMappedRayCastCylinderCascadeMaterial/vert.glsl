#define SHADER_NAME NormalMappedRayCastCylinderCascadeMaterial

precision highp float;

attribute vec2 uv;
attribute vec3 position;

uniform vec3 cameraPosition;
uniform mat4 projectionMatrix;
// uniform mat4 modelMatrix;
uniform mat4 modelViewMatrix;
uniform mat4 inverseModelMatrix;
uniform mat4 viewMatrix;


uniform float scrollAmount;
uniform float cloudsOffsetX;
uniform float cloudsWidth;
uniform vec2 uZW;
uniform float uAltitude;

varying vec4 vUv;
varying float vBendSeed;
//varying float vNormalTweak;

#ifdef USE_FOG
  varying float vFogDepth;
#endif

void main() {
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  vec3 vertSpaceCamPos = (inverseModelMatrix * vec4(cameraPosition, 1.0)).xyz - position.xyz;
  float dotVSCP = dot(vertSpaceCamPos, vec3(0.0, 0.0, 1.0));
  vec3 projectedP = vertSpaceCamPos * ((dotVSCP - 1.0) / dotVSCP);
  vec2 delta = (projectedP.xy - vertSpaceCamPos.xy);
  // delta.y = -delta.y;

  vUv = vec4(vec2(uv.x - scrollAmount, uv.y + uAltitude), delta);
  vBendSeed = uv.x * 2.0 - 1.0;

  #ifdef USE_FOG
    vFogDepth = -mvPosition.z;
  #endif
  //vNormalTweak = curve * -direction * 0.7;
}