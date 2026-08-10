#define SHADER_NAME NormalMappedRayCastCylinderCascadeMaterial
precision lowp float;

uniform sampler2D normalTexture;
uniform sampler2D mapTexture;
uniform float alphaTest;
uniform float aspectRatio;
uniform vec4 xyT_zwS;
uniform mat3 normalMatrix;
varying vec2 vUv;
uniform float halfScreenWidth;

void main() {
  vec2 uv = vUv;
  uv.x -= 0.5;
  uv *= vec2(0.5 * aspectRatio, -0.5);
  uv += vec2(0.5, 0.5 * step(1.0, mod(uv.x, 2.0)));
  // uv += vec2(0.5, 0.125 * step(0.1, mod(uv.x, 0.2)));
  // uv.x *= 1.1;
  uv.x += 0.5;
  uv.x = fract(uv.x) * 0.99 + 0.005;
  // uv *= 4.0;
  vec4 normalTexel = texture2D(normalTexture, uv);
  if(normalTexel.a < alphaTest) {
    discard;
  } else {
    #ifdef TEST_OVERDRAW
    gl_FragColor = vec4(0.2, 0.2, 0, 1.0);
    #else
    //simplifying, hard to appreciate the difference
    
    // vec3 normal = normalTexel.xyz * 2.0 - 1.0;
    // float angle = atan(normal.y, normal.x) - (gl_FragCoord.x / halfScreenWidth) + 1.0;
    // float distance = length(normal.xy);
    // normal.x = cos(angle) * distance;
    // normal.y = sin(angle) * distance;
    // normal = normalize( normalMatrix * normal);
    // vec2 uv2 = ((normal.xy * 0.5 + 0.5) * xyT_zwS.zw) + xyT_zwS.xy;

    vec2 uv2 = (normalTexel.xy * xyT_zwS.zw) + xyT_zwS.xy;

    vec4 color = texture2D(mapTexture, uv2);
    gl_FragColor = vec4(color.rgb, normalTexel.a);
    // gl_FragColor.rgb = (normal * 0.5 + 0.5);
    #endif
  }
}
