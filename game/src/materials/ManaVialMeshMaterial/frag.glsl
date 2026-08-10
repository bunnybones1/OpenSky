#define SHADER_NAME ManaVialMeshMaterial
precision highp float;
uniform sampler2D mapTexture;
uniform highp mat4 modelViewMatrix;


#ifdef USE_OVERLAY_COLOR
  uniform vec3 overlayColor;
#endif

varying vec2 vUvEmpty;
varying vec2 vUvFull;
varying float vDistortionY;

uniform float heightLeft;
uniform float heightRight;
uniform vec3 colorLiquidTop;

void main() {
  vec4 texelFull = texture2D(mapTexture, vUvFull);
  vec4 texelEmpty = texture2D(mapTexture, vUvEmpty);
  float height = 1.0 - mix(heightLeft, heightRight, vUvEmpty.x * 2.0);
  float heightFront = height - vDistortionY;
  float heightBack = height + vDistortionY;
  // float contrast = dxDy(vUvFull.y);

  texelFull.rgb *= mix(colorLiquidTop, vec3(1.0), step(heightFront, vUvFull.y));
  
  gl_FragColor = mix(texelEmpty, texelFull, step(heightBack, vUvFull.y));
  
  #ifdef USE_OVERLAY_COLOR
    vec3 x = gl_FragColor.rgb;
    vec3 m = overlayColor;
    vec3 colorIn = x * m;
    vec3 colorOut = (1.0 - x) * (m - 1.0) + 1.0;
  
    gl_FragColor.rgb = x * colorOut + (1.0 - x) * colorIn;
  #endif
  vec3 srcColor = gl_FragColor.rgb;
  #ifdef USE_COLOR_MODE_SCREEN
    vec3 mixR = modelViewMatrix[1].rgb;
    vec3 mixG = modelViewMatrix[2].rgb;
    vec3 mixB = modelViewMatrix[3].rgb;

    vec3 antiColor = vec3(1.0) - srcColor;
    vec3 mixColor = vec3(
      mixR.r + mixR.g + mixR.b,
      mixG.r + mixG.g + mixG.b,
      mixB.r + mixB.g + mixB.b
    );
    gl_FragColor = vec4(
      srcColor + mixColor * antiColor,
      modelViewMatrix[3][3] * gl_FragColor.a
    );
  #else
    vec3 mixR = modelViewMatrix[1].rgb * srcColor;
    vec3 mixG = modelViewMatrix[2].rgb * srcColor;
    vec3 mixB = modelViewMatrix[3].rgb * srcColor;
    gl_FragColor = vec4(
      mixR.r + mixR.g + mixR.b,
      mixG.r + mixG.g + mixG.b,
      mixB.r + mixB.g + mixB.b,
      modelViewMatrix[3][3] * gl_FragColor.a
    );
  #endif
}
