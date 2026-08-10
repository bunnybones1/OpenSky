precision highp float;

uniform mat4 modelViewMatrix;
uniform sampler2D uTexture;

varying vec3 vColor;
varying float vPretint;
varying vec2 vUvs;

void main() {
  // #ifdef DISABLE_PINGPONG_UV
    vec2 uvs = vec2(min(max(vUvs, 0.0), 1.0));
  // #else
    // vec2 uvs = 1.0 - abs(mod(vUvs, 2.0) - 1.0);
  // #endif

  vec4 texel = texture2D(uTexture, uvs);

  vec4 color = vec4(mix(texel.rgb, vColor, vPretint), 1.0);

  gl_FragColor = vec4(
    modelViewMatrix[1][0] * color.r + modelViewMatrix[1][1] * color.g + modelViewMatrix[1][2] * color.b, 
    modelViewMatrix[2][0] * color.r + modelViewMatrix[2][1] * color.g + modelViewMatrix[2][2] * color.b, 
    modelViewMatrix[3][0] * color.r + modelViewMatrix[3][1] * color.g + modelViewMatrix[3][2] * color.b,
    modelViewMatrix[3][3] * color.a);

}
