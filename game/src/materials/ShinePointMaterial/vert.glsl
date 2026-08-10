#define SHADER_NAME ShinePointMaterial
precision mediump float;

uniform mat4 modelMatrix;
uniform mat4 modelViewMatrix;
uniform mat3 modelNormalMatrix;
uniform mat4 projectionMatrix;

uniform vec3 lightColor;
uniform vec3 materialColor;

attribute vec4 position;
attribute vec3 normal;
uniform vec3 lightPosition;
uniform float lightBrightness;
uniform float size;
uniform vec3 cameraPosition;
uniform float finalPointScale;

varying vec3 vColor;

#ifdef USE_METAL_SHINE
	uniform float uTime;
	uniform float uTimeOffset;
#endif

void main() {
	vec3 worldPosition = (modelMatrix * position).xyz;
	vec4 mvPosition = modelViewMatrix * position;
	gl_Position = projectionMatrix * mvPosition;
	vec3 viewDir = normalize( worldPosition - cameraPosition );
	vec3 lightDir = normalize( worldPosition - lightPosition );
	vec3 worldNormal = normalize(modelNormalMatrix * normal);
	vec3 reflectedLightNormal = reflect( -lightDir, worldNormal );

	float spec = pow( max(0.0, 1.4 * dot( viewDir, reflectedLightNormal ) - 0.4), 64.0) * lightBrightness * size;

	#ifdef USE_METAL_SHINE
  	float sawToothSrc = -(((-gl_Position.x + gl_Position.y * 2.0) / gl_Position.w + (uTime + uTimeOffset) * 100.0) * 2.0 + (worldNormal.x - worldNormal.y));

    float sawTooth = max(0.0, mod(sawToothSrc, 48.0) - 47.0);
    spec = mix(spec * sawTooth, spec * 3.0, sawTooth * sawTooth);
	#endif

	vColor = lightColor * materialColor;
	// vColor = vec3(1.0, 1.0, 1.0);

	gl_Position.z -= 0.0001;
	gl_PointSize = (spec / -mvPosition.z) * finalPointScale;
	// gl_PointSize = 164.0;
}
