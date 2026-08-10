precision highp float;
uniform vec3 uTime;
varying vec2 vUv;
varying vec4 vColors;

float hash(float p)
{
  p  = fract( p*0.3183099+.1 ) * 19.0;
  return fract( p * p + p + p);
}

float noise( float x )
{
  float i = floor(x);
  float f = fract(x);
  f = f*f*(3.0-2.0*f);

  return mix( hash(i),
              hash(i+1.0),f);
}

void main(void) {
  float dist = length(vUv);
  float brightness = (1.0 - dist) * 2.0;
  float angle = atan(vUv.y, vUv.x);
  float lightTime = uTime.y;
  float v1a = noise(angle * 5.0 + lightTime);
  float v1b = noise(angle * 5.0 - lightTime + 60.0);
  float v2 = noise(angle * 35.0 - lightTime);
  brightness -= clamp((abs(v1a * v1b * 2.0 - 1.0) - 0.5) * 5.0, 0.0, 1.0) * 0.5;
  brightness -= abs(v2 * 2.0 - 1.0) * 0.2;
  brightness = mix(brightness, 1.0, 1.0-dist);
  brightness *= uTime.x;
  gl_FragColor = vec4(vColors.rgb, 1.0) * brightness;
  gl_FragColor *= uTime.x * 1.5;
}