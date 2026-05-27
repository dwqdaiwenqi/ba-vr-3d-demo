// 后处理 Pass 输入贴图（上一个渲染结果）
uniform sampler2D tDiffuse;

// 超椭圆遮罩的 x/y 半径（UV 空间，0.5 = 刚好到边缘）
uniform float maskRX;
uniform float maskRY;

// 超椭圆的幂次 n：
//   n=2  → 椭圆（圆角最大）
//   n=4  → 圆角矩形
//   n→∞  → 矩形（完全直角）
uniform float maskN;

// 边缘过渡柔化程度，0=硬边，1=全部柔化
uniform float maskSoft;

// 遮罩区域外的填充颜色（如纯黑）
uniform vec3  maskColor;

// 桶形畸变强度，0=无畸变，正值=向外鼓
uniform float barrel;

// 桶形畸变的中心点（UV 空间，通常是 vec2(0.5, 0.5)）
uniform vec2  barrelCenter;

varying vec2 vUv;

//  - 桶形（k>0）：离中心越远，往外推越多 → 画面中间鼓出来
//  - 枕形（k<0）：离中心越远，往内拉越多 → 画面四角往内收                           
   
// 桶形畸变，就是需要一个相对点，各个采样点会朝相对点方向进行缩放采样，采样强度取决于距离，距离越大越往外推（进行缩放采样）

// 桶形畸变函数：将 UV 坐标往外推，模拟鱼眼/CRT 屏幕弯曲
vec2 distort(vec2 uv, float k) {
  // scale 补偿：畸变越强，整体略微缩小，防止边缘被拉出画面
  float scale = 1.0 + k * 0.5;

  // 以畸变中心为原点，归一化坐标
  vec2 d = (uv - barrelCenter) / scale;

  // 到畸变中心的距离
  float dist = length(d);

  // 核心公式：离中心越远，往外推越多（乘以 1 + k*dist）
  // k=0 时 → 原样返回；k>0 时 → 向外膨胀
  return barrelCenter + d * (1.0 + k * dist);
}

void main() {
  // ── 超椭圆 SDF ──────────────────────────────────────────
  // 第一步：将 UV 偏移到以屏幕中心为原点，再除以半径
  // 得到归一化坐标，使椭圆边界恰好在 d=1
  vec2 d = abs(vUv - vec2(0.5, 0.5)) / vec2(maskRX, maskRY);

  // 第二步：超椭圆的sdf计算，当n=2时候，回退到欧式距离
  //   dist = ( |x|^n + |y|^n )^(1/n)
  
  // 氏距离就是平时说的"两点之间的距离"，即勾股定理：                               
  // dist = sqrt(x² + y²)                                                                                                        
  // dist = (x² + y²)^(1/2)   ← 就是 sqrt(x²+y²)     


  //   n=2 时退化为普通欧氏距离（圆/椭圆）
  //   n 越大形状越方，趋近矩形
  float dist = pow(pow(d.x, maskN) + pow(d.y, maskN), 1.0 / maskN);

  // 第三步：用 smoothstep 在边界处做柔和过渡
  //   dist < (1 - maskSoft) → mask=0，完全显示画面
  //   dist > 1              → mask=1，完全显示遮罩色
  //   中间区域              → 平滑混合
  float mask = smoothstep(1.0 - maskSoft, 1.0, dist);
  // ────────────────────────────────────────────────────────

  // 完全在遮罩外：直接输出遮罩色，提前返回（省去采样开销）
  if (mask >= 1.0) {
    gl_FragColor = vec4(maskColor, 1.0);
    return;
  }

  // 对 UV 施加桶形畸变后再采样贴图
  vec2 uv = distort(vUv, barrel);
  vec4 color = texture2D(tDiffuse, uv);

  // 根据 mask 值在画面颜色和遮罩色之间插值（边缘柔化）
  gl_FragColor = vec4(mix(color.rgb, maskColor, mask), 1.0);
}
