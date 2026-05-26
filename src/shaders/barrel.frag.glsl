uniform sampler2D tDiffuse;
uniform float maskRX;
uniform float maskRY;uniform float maskN;
uniform float maskSoft;
uniform vec3  maskColor;
uniform float barrel;
uniform vec2  barrelCenter;

varying vec2 vUv;

vec2 distort(vec2 uv, float k) {
  float scale = 1.0 + k * 0.5;
  vec2 d = (uv - barrelCenter) / scale;
  float dist = length(d);
  return barrelCenter + d * (1.0 + k * dist);
}

void main() {
  vec2 d = abs(vUv - vec2(0.5, 0.5)) / vec2(maskRX, maskRY);
  float dist = pow(pow(d.x, maskN) + pow(d.y, maskN), 1.0 / maskN);
  float mask = smoothstep(1.0 - maskSoft, 1.0, dist);

  if (mask >= 1.0) {
    gl_FragColor = vec4(maskColor, 1.0);
    return;
  }

  vec2 uv = distort(vUv, barrel);
  vec4 color = texture2D(tDiffuse, uv);
  gl_FragColor = vec4(mix(color.rgb, maskColor, mask), 1.0);
}
