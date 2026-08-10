precision mediump float;
uniform highp mat4 modelViewMatrix;
uniform float aspect;
uniform float time;
uniform vec2 size;
uniform vec4 highlight0;
uniform vec4 highlight1;

varying vec2 vUv;

const float PI = 3.14159265358979;

float circle(vec2 center, vec2 coord, float rad, float blur) {
  float dist = distance(coord, center);
  return smoothstep(rad, rad + blur, dist);
}

void main() {
  vec2 skew0 = vec2(aspect * highlight0.w, 1.0);
  vec2 skew1 = vec2(aspect * highlight1.w, 1.0);
  float radius0 = highlight0.z;
  float radius1 = highlight1.z;
  float pulseWidth = 0.1 * sin(time * PI);
  radius1 += radius1 * pulseWidth;
  radius0 += radius0 * pulseWidth;
  float blur1 = radius1 * 0.5;
  float blur0 = radius0 * 0.5;
  float circle0 = circle(highlight0.xy * skew0, vUv * skew0, radius0, blur0);
  float circle1 = circle(highlight1.xy * skew1, vUv * skew1, radius1, blur1);
  float circleOpacity = clamp(circle0 * circle1, 0.0, 0.4);

  gl_FragColor = vec4(1.0, 1.0, 1.0, circleOpacity);

  vec3 srcColor = gl_FragColor.rgb;
  vec3 mixR = modelViewMatrix[1].rgb * srcColor;
  vec3 mixG = modelViewMatrix[2].rgb * srcColor;
  vec3 mixB = modelViewMatrix[3].rgb * srcColor;
  gl_FragColor = vec4(
    mixR.r + mixR.g + mixR.b,
    mixG.r + mixG.g + mixG.b,
    mixB.r + mixB.g + mixB.b,
    modelViewMatrix[3][3] * gl_FragColor.a
  );
}