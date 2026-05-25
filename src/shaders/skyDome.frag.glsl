// 天空球片元着色器
// 负责渲染渐变天空底色 + FBM 程序化云朵

// ── Uniforms ──────────────────────────────────────────────────────────────────
uniform float uTime;          // 全局时间（秒），驱动云朵移动
uniform vec3  uTopColor;      // 天空顶部颜色（天顶色）
uniform vec3  uBottomColor;   // 天空底部颜色（地平线色）
uniform vec3  uCloudColor;    // 云朵颜色
uniform float uCloudCoverage; // 云量 [0,1]，越大云越多
uniform float uCloudDensity;  // 云的不透明度倍数 [0,1]
uniform float uCloudScale;    // 云的空间尺寸，越大云块越大
uniform float uCloudSpeed;    // 云朵横向飘移速度
uniform float uGradientPow;   // 渐变曲线指数，>1 使过渡区间向顶部压缩
uniform float uShowCloud;     // 云朵开关（1.0=显示，0.0=隐藏）
uniform float uEdge0;         // smoothstep 渐变起点（对应 t 轴）
uniform float uEdge1;         // smoothstep 渐变终点（对应 t 轴）

// 从顶点着色器传入的世界空间方向向量（已归一化）
varying vec3 vWorldDir;

// ── 哈希函数 ──────────────────────────────────────────────────────────────────
// 输入 2D 坐标，输出伪随机 [0,1] 标量
// fract(p * magic) 把整数网格坐标打散到小数域
// dot + fract 再做一次非线性混淆，使相邻格子的输出不相关
float hash(vec2 p) {
  p = fract(p * vec2(127.1, 311.7));
  p += dot(p, p + 19.19);
  return fract(p.x * p.y);
}

// ── 值噪声 ────────────────────────────────────────────────────────────────────
// 在整数网格上采样 hash，再用 smoothstep 曲线（u = f²(3-2f)）双线性插值
// 比直接线性插值更平滑，无明显网格感
float noise(vec2 p) {
  vec2 i = floor(p);   // 整数网格格子坐标
  vec2 f = fract(p);   // 格子内局部坐标 [0,1)

  // smoothstep 权重：使插值在边界处一阶导数为 0（无棱角）
  vec2 u = f * f * (3.0 - 2.0 * f);

  // 四角哈希值双线性插值
  return mix(
    mix(hash(i),              hash(i + vec2(1, 0)), u.x),
    mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x),
    u.y
  );
}

// ── FBM（分形布朗运动）────────────────────────────────────────────────────────
// 叠加 5 层频率倍增、振幅减半的噪声，模拟自然界多尺度细节（云、地形、水面）
// 每层：v += amplitude * noise(p)
//        p 频率 ×2.1（略大于 2，避免完美对称）
//        振幅 ×0.5（每层贡献减半，保证总和收敛）
// vec2(1.7, 9.2) 偏移防止各层在同一位置出现对称图案
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5; // 初始振幅，各层之和 ≈ 1.0（0.5+0.25+0.125+...）
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = p * 2.1 + vec2(1.7, 9.2);
    a *= 0.5;
  }
  return v;
}

// ── 主函数 ────────────────────────────────────────────────────────────────────
void main() {
  vec3 dir = normalize(vWorldDir);

  // ── 天空渐变 ──
  // dir.y 范围 [-1, 1]，映射到 t ∈ [0, 1]（0=正下方，1=正上方）
  float t = clamp(dir.y * 0.5 + 0.5, 0.0, 1.0);
  // 指数曲线：uGradientPow>1 使过渡区间"更靠上"，让地平线附近颜色更纯
  t = pow(t, uGradientPow);
  // 用 smoothstep 在 [uEdge0, uEdge1] 区间内平滑混合底色→顶色
  float mask = smoothstep(uEdge0, uEdge1, t);
  vec3 skyColor = mix(uBottomColor, uTopColor, mask);

  // ── FBM 云朵 ──
  float cloudMask = 0.0;
  if (dir.y > 0.0) {
    // 球面投影到平面 UV：用 xz/y 模拟透视投影到水平面
    // +0.1 防止 dir.y≈0（地平线方向）时除零，同时压缩地平线处的云密度
    vec2 uv = dir.xz / (dir.y + 0.1) * uCloudScale;

    // 云朵随时间横向平移
    uv.x += uTime * uCloudSpeed;

    // 两层 FBM 叠加：第二层频率×2、相位偏移，增加细节层次
    float n = fbm(uv) * 0.6 + 0.4 * fbm(uv * 2.0 + 3.7);

    // 地平线渐隐：dir.y 越小（越靠近地平线）云越透明，避免地平线处云突然截断
    float horizon = smoothstep(0.0, 0.25, dir.y);

    // 阈值化：噪声值超过 (1 - coverage) 的部分视为云，0.3 是羽化宽度
    cloudMask = smoothstep(1.0 - uCloudCoverage, 1.0 - uCloudCoverage + 0.3, n) * horizon;
  }

  // 用 cloudMask 在天空色和云朵色之间插值，uCloudDensity 控制云的最大不透明度
  vec3 color = mix(skyColor, uCloudColor, cloudMask * uCloudDensity * uShowCloud);
  gl_FragColor = vec4(color, 1.0);
}
