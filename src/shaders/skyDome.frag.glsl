uniform float uTime;
uniform vec3  uTopColor;
uniform vec3  uBottomColor;
uniform vec3  uCloudColor;
uniform float uCloudCoverage;
uniform float uCloudDensity;
uniform float uCloudScale;
uniform float uCloudSpeed;
uniform float uGradientPow;
uniform float uShowCloud;
uniform float uEdge0;
uniform float uEdge1;

varying vec3 vWorldDir;

float hash(vec2 p) {
  p = fract(p * vec2(127.1, 311.7));
  p += dot(p, p + 19.19);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i),              hash(i + vec2(1, 0)), u.x),
    mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = p * 2.1 + vec2(1.7, 9.2);
    a *= 0.5;
  }
  return v;
}

void main() {
  vec3 dir = normalize(vWorldDir);

  float t = clamp(dir.y * 0.5 + 0.5, 0.0, 1.0);
  t = pow(t, uGradientPow);
  float mask = smoothstep(uEdge0, uEdge1, t);
  vec3 skyColor = mix(uBottomColor, uTopColor, mask);

  float cloudMask = 0.0;
  if (dir.y > 0.0) {
    vec2 uv = dir.xz / (dir.y + 0.1) * uCloudScale;
    uv.x += uTime * uCloudSpeed;
    float n = fbm(uv) * 0.6 + 0.4 * fbm(uv * 2.0 + 3.7);
    float horizon = smoothstep(0.0, 0.25, dir.y);
    cloudMask = smoothstep(1.0 - uCloudCoverage, 1.0 - uCloudCoverage + 0.3, n) * horizon;
  }

  vec3 color = mix(skyColor, uCloudColor, cloudMask * uCloudDensity * uShowCloud);
  gl_FragColor = vec4(color, 1.0);
}
