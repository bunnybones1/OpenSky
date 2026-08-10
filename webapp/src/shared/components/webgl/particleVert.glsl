precision highp float;
attribute float id;
uniform vec3 uTime;
varying vec3 vColors;

float hash(float p)
{
  p  = fract( p*0.3183099+.1 ) * 19.0;
  return fract( p * p + p + p);
}


float hash2(vec2 p)
{
  p  = fract( p*0.3183099+.1 );
  p *= 17.0;
  return fract( p.x*p.y*(p.x+p.y) );
}

float noise( vec2 x )
{
  vec2 i = floor(x);
  vec2 f = fract(x);
  f = f*f*(3.0-2.0*f);

  return mix(mix( hash2(i+vec2(0,0)),
                  hash2(i+vec2(1,0)),f.x),
             mix( hash2(i+vec2(0,1)),
                  hash2(i+vec2(1,1)),f.x),f.y);
}

void main(void) {
  float globalTime = uTime.z;
  float distribution = 1.0 - hash(id+11.0);
  float timeOffset = (1.0 - pow(distribution, 8.0)) * 0.33;
  float time = globalTime + timeOffset;
  float uId = id + floor(time) * 0.015;
  vec2 coord = vec2(hash(uId), hash(uId+100.0)) * 2.0 - 1.0;
  float localTime = min(1.0, max(0.0, fract(time) * 3.0 - 1.0));
  float invLocalTime = 1.0 - localTime;
  localTime = 1.0 - (invLocalTime * invLocalTime * invLocalTime);
  float localTimeSine = sin(localTime * 3.14159);
  coord.y -= localTimeSine * 0.2;

  float cLength = length(coord);
  float cLengthLimited = max(1.0, cLength);
  coord /= mix(1.0, cLengthLimited, 0.75);
  // coord /= cLengthLimited;

  vec2 pos = mix(vec2(0.0, -0.5), coord, mix(0.5, 1.0, localTime));
  vec2 timePos = pos * 3.0 + globalTime * 2.0;
  vec2 turbulance = (vec2(
    noise(timePos),
    noise(timePos + vec2(15.0, -17.0))
  ) - 0.5) * 0.4;
  gl_Position = vec4(pos + turbulance * localTimeSine, 0.0, 1.0);
  // gl_Position = vec4(pos, 0.0, 1.0); //temp
  gl_Position.y = mix(gl_Position.y, 2.0, step(0.99, localTime));
  gl_PointSize = localTimeSine * mix(4.0, 10.0, pow(hash(uId+8.0), 3.0));
  vColors = normalize(vec3(hash(uId+2.0), hash(uId+5.0), hash(uId+10.0)));
  vColors = mix(vColors.rgb, vec3(0.5, 2.0, 5.0) * localTimeSine, 0.5);
}