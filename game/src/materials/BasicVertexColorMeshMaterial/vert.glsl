#define SHADER_NAME BasicVertexColorMeshMaterial

precision highp float;

#ifdef GROW_MASK_ATTRIBUTE
  uniform vec2 uOriginalAssetSize;
  uniform vec2 uGrowSize;
  uniform float uPrescale;
#endif
#ifdef COLOR_ATTRIBUTE
  uniform vec3 uColor;
  uniform float uOpacity;
  varying vec4 vColor;
#endif
attribute vec4 position;

uniform mat4 projectionMatrix;
uniform mat4 modelViewMatrix;

void main() {
  #ifdef GROW_MASK_ATTRIBUTE
    vec4 pos = position;
    pos.y = uOriginalAssetSize.y - pos.y;
    pos.xy += GROW_MASK_ATTRIBUTE * (uGrowSize / uPrescale - uOriginalAssetSize);
    pos.y -= uOriginalAssetSize.y;
    pos.xy *= uPrescale;
    gl_Position = projectionMatrix * modelViewMatrix * pos;
    // gl_Position.xy = position.xy * vec2(0.015);
  #else
    gl_Position = projectionMatrix * modelViewMatrix * position;
  #endif
  #ifdef COLOR_ATTRIBUTE
    #ifdef COLOR_ATTRIBUTE_HAS_ALPHA
      vColor = COLOR_ATTRIBUTE * vec4(uColor, uOpacity);
    #else
      vColor = vec4(COLOR_ATTRIBUTE * uColor, uOpacity);
    #endif
  #endif
}