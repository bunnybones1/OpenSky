import { Ease } from '~/systems/animation/Easing'

export type EaseKitName =
  | 'linear'
  | 'fullOn'
  | 'sine'
  | 'cos'
  | 'sqrdSine'
  | 'sqr'
  | 'invSqr'
  | 'quad'
  | 'invQuad'
  | 'debugArrow'

interface EaseKit {
  glsl: string
  js: Ease
}

export const easeKits: { [K in EaseKitName]: EaseKit } = {
  linear: {
    glsl: `float ease(in float v) { return v; }`,
    js: v => v
  },
  fullOn: {
    glsl: `float ease(in float v) { return 1.0; }`,
    js: () => 1.0
  },
  sine: {
    glsl: `float ease(in float v) { 
      return sin(v * 3.14159); 
    }`,
    js: v => Math.sin(v * Math.PI)
  },
  cos: {
    glsl: `float ease(in float v) { 
      return cos(v * 3.14159); 
    }`,
    js: v => Math.cos(v * Math.PI)
  },
  sqrdSine: {
    glsl: `float ease(in float v) { 
      return sin(v * v * 3.14159); 
    }`,
    js: v => Math.sin(v * v * Math.PI)
  },
  sqr: {
    glsl: `float ease(in float v) { 
      return v * v; 
    }`,
    js: v => v * v
  },
  invSqr: {
    glsl: `float ease(in float v) { 
      float iv = 1.0 - v;
      return 1.0 - (iv * iv); 
    }`,
    js: v => {
      const iv = 1 - v
      return 1 - iv * iv
    }
  },
  quad: {
    glsl: `float ease(in float v) { 
      return v * v * v * v; 
    }`,
    js: v => v * v * v * v
  },
  invQuad: {
    glsl: `float ease(in float v) { 
      float iv = 1.0 - v;
      return 1.0 - (iv * iv * iv * iv); 
    }`,
    js: v => {
      const iv = 1 - v
      return 1 - iv * iv * iv * iv * iv * iv * iv * iv * iv
    }
  },
  debugArrow: {
    glsl: `float ease(in float v) { 
      return 1.0 - (v * v * v * 0.9 + 0.1); 
    }`,
    js: v => 1.0 - (v * v * v * 0.9 + 0.1)
  }
}
