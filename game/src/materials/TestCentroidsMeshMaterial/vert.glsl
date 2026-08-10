#define SHADER_NAME TestCentroidsMeshMaterial
precision highp float;

attribute vec4 position;
attribute vec3 normal;
attribute vec3 color;

uniform mat4 projectionMatrix;
uniform mat4 modelViewMatrix;
varying vec3 vColor;

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
    // vec3 axis = normalize(vec3(0.0, 1.0, 0.0));
    vec3 axis = normalize(pos.zyx - pos.xyz + vec3(2.0, 0.042, 0.0));
    vec3 pivot = pos.xyz; 

    // vec3 timePivot = pivot + subposition * 0.5;
    // float pz = -timePivot.z - 0.1;
    float time = min(1.0, max(0.0, uCentroidTime + timedata.x));
    time = 1.0 - time;
    time *= time;
    float angle = time * 3.1415 * -0.8;
    // angle = min(6.284, max(0.0, angle));

    mat3 rotMat = rotationMatrix(axis, angle);
    float invTime = 1.0-time;
    float scale = 1.0-(time*time);
    pos.xyz -= subposition * scale * rotMat;
    vec3 raise = (1.0 - (invTime * invTime)) * (pivot+vec3(0.0, 0.05, 0.0)) * 2.0;
    pos.xyz += raise;
    vec3 norm = normal * rotMat;
  #else
    vec3 norm = normal;
  #endif

  gl_Position = projectionMatrix * (modelViewMatrix * pos);
  vColor = color * max(0.0, dot(norm, vec3(0.0, 1.0, 0.0)));
}