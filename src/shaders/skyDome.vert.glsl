// 天空球顶点着色器
// 天空球是一个半径 100 的球体，camera 在球心内部，side: BackSide 使内面可见

// 传给片元着色器的世界空间方向向量（从球心指向当前顶点）
varying vec3 vWorldDir;

void main() {
  // position 是模型空间的顶点坐标（球面上的点）
  // 乘以 modelMatrix 变换到世界空间，w=0 表示只做旋转/缩放，不做平移
  // normalize 取方向，用于在片元着色器中判断"朝哪个方向看"
  vWorldDir = normalize((modelMatrix * vec4(position, 0.0)).xyz);

  // 标准 MVP 变换，输出裁剪空间坐标
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
