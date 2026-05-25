// 后处理片元着色器：VR 超椭圆遮罩 + 桶形畸变
// 渲染管线：先算遮罩边界，边界外直接填充遮罩色；边界内做桶形畸变后采样场景纹理

// ── Uniforms ──────────────────────────────────────────────────────────────────
uniform sampler2D tDiffuse;   // 上一个 Pass 的渲染结果（场景颜色纹理）
uniform float maskRX;         // 超椭圆横轴半径，相对于 UV 空间 [0,1]
uniform float maskRY;         // 超椭圆纵轴半径，相对于 UV 空间 [0,1]
uniform float maskN;          // 超椭圆指数：2=椭圆，>2=方圆形，越大越接近矩形
uniform float maskSoft;       // 遮罩边缘羽化宽度（smoothstep 的范围），0=硬边
uniform vec3  maskColor;      // 遮罩区域填充色（通常为白色，模拟 VR 镜片边框）
uniform float barrel;         // 桶形畸变强度，>0=桶形（中心膨胀），<0=枕形（边缘膨胀）
uniform vec2  barrelCenter;   // 畸变中心点，通常为 (0.5, 0.5)

// 从顶点着色器透传的 UV 坐标
varying vec2 vUv;

// ── 桶形畸变函数 ──────────────────────────────────────────────────────────────
// 将当前像素的 UV 映射到畸变后的采样坐标
// 原理：越靠近边缘，采样点越向外偏移，使渲染结果中心"膨胀"
vec2 distort(vec2 uv, float k) {
  // scale：整体收缩 UV，防止畸变后边角超出 [0,1] 导致边缘拉伸伪影
  // k 越大收缩越多，刚好让畸变后的边角坐标落回 [0,1] 范围内
  float scale = 1.0 + k * 0.5;

  // d：当前像素相对于畸变中心的偏移向量，除以 scale 先整体收缩
  vec2 d = (uv - barrelCenter) / scale;

  // dist：偏移向量的长度，即像素到中心的距离，越靠边缘越大
  float dist = length(d);

  // 核心畸变公式：拉伸 d 向量，系数 (1 + k*dist) 使边缘偏移更大（非线性放大）
  // 最终加回 barrelCenter，还原为绝对 UV 坐标
  return barrelCenter + d * (1.0 + k * dist);
}

// ── 主函数 ────────────────────────────────────────────────────────────────────
void main() {
  // ── 超椭圆遮罩 SDF ──
  // 将 UV 以 (0.5, 0.5) 为中心，按轴半径归一化，得到各轴的"归一化距离"
  vec2 d = abs(vUv - vec2(0.5, 0.5)) / vec2(maskRX, maskRY);

  // 超椭圆 SDF：pow(|dx|^n + |dy|^n, 1/n)
  // n=2 是标准椭圆；n 越大越接近矩形；dist<1 在椭圆内，>1 在外
  float dist = pow(pow(d.x, maskN) + pow(d.y, maskN), 1.0 / maskN);

  // smoothstep 羽化：dist 从 (1-maskSoft) 到 1.0 的区间内从 0 过渡到 1
  // maskSoft=0 时 smoothstep(1,1,dist) 退化为硬边（step 函数）
  float mask = smoothstep(1.0 - maskSoft, 1.0, dist);

  // 完全在遮罩外（mask==1），直接输出遮罩色，跳过后续采样计算
  if (mask >= 1.0) {
    gl_FragColor = vec4(maskColor, 1.0);
    return;
  }

  // ── 桶形畸变采样 ──
  // 用畸变后的 UV 从场景纹理采样，产生光学畸变效果
  vec2 uv = distort(vUv, barrel);
  vec4 color = texture2D(tDiffuse, uv);

  // 边缘羽化混合：遮罩边界处（0 < mask < 1）将场景色与遮罩色混合，形成柔和过渡
  gl_FragColor = vec4(mix(color.rgb, maskColor, mask), 1.0);
}
