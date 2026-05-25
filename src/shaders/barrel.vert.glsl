// 后处理全屏四边形顶点着色器
// EffectComposer 会把上一个 Pass 的渲染结果作为纹理传入，
// 这里只需把 UV 透传给片元着色器，不做任何变形

// 传给片元着色器的纹理坐标（来自 PlaneGeometry 的内置 uv 属性）
varying vec2 vUv;

void main() {
  // 直接透传 UV，范围 [0,1]×[0,1]，左下角(0,0)，右上角(1,1)
  vUv = uv;

  // 标准 MVP 变换，对全屏四边形而言等价于 NDC 直通
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
