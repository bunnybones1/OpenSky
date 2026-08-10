precision highp float;

attribute vec4 position;

uniform vec3 cameraPosition;
uniform mat4 projectionMatrix;
// uniform mat4 modelMatrix;
uniform mat4 modelViewMatrix;
uniform mat4 inverseModelMatrix;
// uniform mat3 normalMatrix;

uniform vec2 uParallaxStrength;
uniform vec3 uDecalColor;

varying vec4 vColor;
varying vec3 vPretintBgMaskFgMask;
attribute vec2 uv;
attribute vec2 uv2;
varying vec4 vUvs;
varying float vFGDepth;

uniform vec4 uAccentColor;

#ifdef USE_FOIL
  varying vec2 vFoilBandPhase;
  uniform float uFoilBandWavelength;
  uniform float uTiltShineSensitivity;
  uniform float uBandOffset;
#endif

#ifdef USE_CENTROIDS
  attribute vec3 subposition;
  attribute vec3 timedata;
  uniform float uCentroidTime;

  mat3 rotationMatrix(vec3 axis, float angle) {
    float s=sin(angle);
    float c=cos(angle);
    float oc=1.0-c;
    vec3 as=axis*s;
    mat3 p=mat3(axis.x*axis,axis.y*axis,axis.z*axis);
    mat3 q=mat3(c,-as.z,as.y,as.z,c,-as.x,-as.y,as.x,c);
    return p*oc+q;
  }
#endif

void main() {
  vec4 pos = position;
  #ifdef USE_CENTROIDS
    // vec3 axis = normalize(vec3(0.0, 0.0, 1.0));
    vec3 axis = normalize(pos.yzx - pos.xzy + vec3(0.0, 0.0, 0.142));
    vec3 pivot = pos.xyz; 

    vec3 timePivot = pivot + subposition * 0.5;
    float pz = -timePivot.z - 0.1;
    float time = min(1.0, max(0.0, -0.5 + uCentroidTime + (timePivot.x*timePivot.x+pz*pz) * 20.0 - 2.5 - (timedata.x * 1.5 - 4.0)));
    // time = 1.0 - time;
    time *= time;
    float angle = time * 3.1415 * -2.4;
    // angle = min(6.284, max(0.0, angle));

    mat3 rotMat = rotationMatrix(axis, angle);
    float invTime = 1.0-time;
    float scale = 1.0-(time*time);
    pos.xyz -= subposition * scale * rotMat;
    vec3 raise = time * time * (pivot+vec3(0.0, 0.0, -0.1));
    pos.xyz += raise;
  #endif

  float colorMix = COLOR_MASK_ATTRIBUTE * 2.0;
  vColor = vec4(
    mix(
      uDecalColor * min(1.0, colorMix),
      uAccentColor.rgb, 
      max(0.0, colorMix - 1.0) * uAccentColor.a
    ), 
    max(0.0, colorMix * 1.5 - 0.5)
  );
  gl_Position = projectionMatrix * modelViewMatrix * pos;
  
	vPretintBgMaskFgMask = vec3(PRETINT_ATTRIBUTE, BG_MASK_ATTRIBUTE, 1.0-step(FG_MASK_ATTRIBUTE, 0.3));

  vec3 invCamPos = (inverseModelMatrix * vec4(cameraPosition, 1.0)).xyz;
  vec3 vertSpaceCamPos = invCamPos - pos.xyz;
  #ifdef USE_CENTROIDS
    vec3 normal = rotMat * vec3(0.0, 0.0, 1.0);
  #else
    vec3 normal = vec3(0.0, 0.0, 1.0);
  #endif
  float dotVSCP = dot(vertSpaceCamPos, normal);
  vec3 projectedP = vertSpaceCamPos * ((dotVSCP - 1.0) / dotVSCP);
  vec2 delta = (projectedP.xy - vertSpaceCamPos.xy);
  delta.y = -delta.y;

	vUvs = vec4(uv2 + delta * uParallaxStrength.x, uv + delta * uParallaxStrength.y);
	vFGDepth = 1.0-step(uParallaxStrength.x, 0.0);
  #ifdef USE_FOIL
    float foilBandPhase = (uv.x * 0.1 + uv.y * 3.0) * uFoilBandWavelength + (delta.x * 0.3 + delta.y) * uTiltShineSensitivity + uBandOffset;
    vFoilBandPhase = vec2(foilBandPhase, (delta.x * 1.1 + delta.y * 0.3) + (invCamPos.x + invCamPos.y) * uTiltShineSensitivity + uBandOffset);
    // vFoilBandPhase = vec2(foilBandPhase, sin((invCamPos.x + invCamPos.y) * 100.0));
  #endif
}