#define SHADER_NAME LightCacheMeshMaterial
precision highp float;

attribute vec4 position;
attribute vec3 normal;

uniform vec3 cameraPosition;
uniform mat4 projectionMatrix;
uniform mat4 modelMatrix;
uniform mat4 modelViewMatrix;
uniform mat3 normalMatrix;
uniform mat3 modelNormalMatrix;

// varying vec3 vColor;
uniform vec2 uReflectionStrengthPerpendicularVSHeadOn;
varying float vReflectionStrength;
varying vec3 vReflectionNormal;
#ifndef SKIP_TRANSMISSION_COLOR
  varying vec3 vTransmissionNormal;
  uniform float uRefractionZoom;
#endif

#ifndef USE_METALLIC_DIFFUSE
  varying vec3 vDiffusionNormal;
#endif

#ifdef USE_METAL_SHINE
  uniform float uShineTime;
	uniform float uShineTimeOffset;
  varying mediump float vSawToothSrc;
#endif

#ifdef USE_TRANSPARENCY
  varying mediump float vTransparency;
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

#ifdef CENTROID_SETTINGS_PLAQUE_BROKEN
  uniform float uCentroidTime2;
#endif

#include <fog_pars_vertex>

#ifdef USE_UVS
  attribute vec2 uv;
  #ifdef USE_UV_TRANSFORM
    uniform mat3 uUvTransform;
  #endif
#endif

void main() {
  vec4 pos = position;
  #ifdef USE_CENTROIDS
    vec3 anchor = pos.xyz + subposition;
    pos.xyz -= anchor;
    #ifdef CENTROID_SETTINGS_PLAQUE

      // vec3 axis = normalize(vec3(0.0, 1.0, 0.0));
      vec3 axis = normalize(fract((anchor.yzx - anchor.xyz) * 100.0));
      vec3 pivot = anchor; 

      // vec3 timePivot = pivot + subposition * 0.5;
      // float pz = -timePivot.z - 0.1;
      float timeRaw = uCentroidTime + timedata.x;
      float time = min(1.0, max(0.0, timeRaw));
      // time += cos(timeRaw * 180.0) * max(0.0, min(1.0, 1.2 - timeRaw)) * 0.005;
      float spinTime = 1.0 - time;
      // spinTime *= spinTime;
      float angle = spinTime * -27.8;
      #ifdef CENTROID_SETTINGS_PLAQUE_BROKEN
        angle += cos(uCentroidTime2 * 3.1415 + timedata.x * 10.0) * 0.3 * min(0.0, (timedata.x + 0.1) * 10.0);
      #endif
      // angle = min(6.284, max(0.0, angle));

      mat3 rotMat = rotationMatrix(axis, angle);
      mat3 invRotMat = rotationMatrix(axis, -angle);
      float invTime = 1.0-time;
      pos.xyz *= rotMat;
      // pos.xyz = (subposition * rotMat);
      // float raiseTime = (1.0 - (invTime * invTime));
      float raiseTime = (1.0 - (time * time * time * time * time * time * time * time));
      // float raiseTime = invTime*invTime;
      float scale = 1.0-raiseTime;
      // float scale = 1.0-(invTime*invTime);
      // pos.xyz *= scale;
      vec3 raise = raiseTime * normalize(vec3(0.0 - anchor.x * 0.4, 1.62, -0.135 - timedata.x)) * 4.2;
      pos.xyz += raise;
      // pos.xyz += subposition;
      pos.xyz += anchor;


      #ifdef CENTROID_SETTINGS_PLAQUE_BROKEN
        pos.z += sin(uCentroidTime2 * 3.1415 + timedata.x * 10.0) * 0.3 * min(0.0, (timedata.x + 0.1) * 0.5);
      #endif

      vec3 norm = normal * rotMat;
    #else

      // vec3 axis = normalize(vec3(0.0, 1.0, 0.0));
      vec3 axis = normalize(fract((anchor.yzx - anchor.xyz) * 100.0));
      vec3 pivot = anchor; 

      // vec3 timePivot = pivot + subposition * 0.5;
      // float pz = -timePivot.z - 0.1;
      float timeRaw = uCentroidTime + (-timedata.x) * 8.0 + 1.0;
      float time = min(1.0, max(0.0, timeRaw));
      // time += cos(timeRaw * 180.0) * max(0.0, min(1.0, 1.2 - timeRaw)) * 0.005;
      float invTime = 1.0-time;
      float spinTime = invTime * invTime;
      // spinTime *= spinTime;
      float angle = spinTime * 6.0;
      // angle = min(6.284, max(0.0, angle));

      mat3 rotMat = rotationMatrix(axis, angle);
      mat3 invRotMat = rotationMatrix(axis, -angle);
      pos.xyz *= rotMat;
      // pos.xyz = (subposition * rotMat);
      vec3 raiseTime = vec3(invTime * invTime * invTime, invTime, invTime * invTime * invTime);
      // float raiseTime = 1.0 - (1.0 - (time * time * time * time * time * time * time * time));
      // float raiseTime = invTime*invTime;
      float scale = 1.0-raiseTime.x;
      // float scale = 1.0-(invTime*invTime);
      // pos.xyz *= scale;
      vec3 raise = raiseTime * normalize((anchor + vec3( 0.0, -0.03, -0.025)) * 3.0);
      pos.xyz += raise;
      // pos.xyz += subposition;
      pos.xyz += anchor;
      vec3 norm = normal * rotMat;
    #endif
  #else
    vec3 norm = normal;
  #endif

  vec3 clipNorm = normalMatrix * norm;

  vec4 mvPosition = modelViewMatrix * pos;
  gl_Position = projectionMatrix * mvPosition;

  vec3 worldPosition = (modelMatrix * position).xyz;
  vReflectionNormal = clipNorm;
  #ifndef USE_METALLIC_DIFFUSE
    vDiffusionNormal = clipNorm;
  #endif
  #ifndef SKIP_TRANSMISSION_COLOR
    vTransmissionNormal = clipNorm;
  #endif

  float viewNormalZ = normalize( clipNorm ).z;
  vReflectionStrength = mix(uReflectionStrengthPerpendicularVSHeadOn.x, uReflectionStrengthPerpendicularVSHeadOn.y, viewNormalZ);

  #ifdef USE_METAL_SHINE
    vSawToothSrc = -(((-gl_Position.x + gl_Position.y * 2.0) / gl_Position.w + (uShineTime + uShineTimeOffset) * 100.0) * 2.0 + worldNormal.x + worldNormal.y);
  #endif

  #ifdef USE_TRANSPARENCY
    vTransparency = vReflectionStrength;
  #endif

  #include <fog_vertex>

  #ifdef USE_UVS
    #ifdef USE_UV_TRANSFORM
      vUv = (uUvTransform * vec3(uv, 0.0)).xy;
    #else
      vUv = uv;
    #endif
  #endif

}