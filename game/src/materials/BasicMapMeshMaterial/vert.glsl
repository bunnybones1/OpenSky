#define SHADER_NAME BasicMapMeshMaterial
precision highp float;

attribute vec2 uv;
attribute vec4 position;

uniform mat4 projectionMatrix;
uniform mat4 modelViewMatrix;

#ifdef USE_RESIZE_2D
uniform vec2 size;
#endif

#ifdef USE_PERSPECTIVE_POINT
uniform vec3 perspectivePoint;
#endif

varying vec2 vUv;

void main() {
#ifdef USE_RESIZE_2D
  vec2 pos = position.xy * size;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, position.zw);
#else

#ifdef USE_PERSPECTIVE_POINT
  mat4 mvm = modelViewMatrix;

    // float extractedScaleX = sqrt(mvm[0][0] * mvm[0][0] + mvm[0][1] * mvm[0][1] + mvm[0][2] * mvm[0][2]);
  float extractedScaleY = sqrt(mvm[1][0] * mvm[1][0] + mvm[1][1] * mvm[1][1] + mvm[1][2] * mvm[1][2]);
  float extractedScaleZ = sqrt(mvm[2][0] * mvm[2][0] + mvm[2][1] * mvm[2][1] + mvm[2][2] * mvm[2][2]);

  float relScaleY = extractedScaleY / extractedScaleZ;

  vec4 pos = position;
  float camDistance = perspectivePoint.y;
  float ratioToCam = camDistance / (camDistance - pos.y);
  pos.xz *= ratioToCam;
  gl_Position = projectionMatrix * mvm * pos;
#else
  gl_Position = projectionMatrix * modelViewMatrix * position;
#endif

#endif
  vUv = uv;
}