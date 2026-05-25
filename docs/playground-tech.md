# Playground 技术文档

基于 Three.js 实现的 VR 风格 3D 落地页，包含程序化天空、动态地面波浪、VR 后处理效果与 2D UI 系统。

---

## 目录

1. [整体架构](#整体架构)
2. [天空球](#天空球)
3. [地面网格](#地面网格)
4. [波浪动画](#波浪动画)
5. [后处理：VR 遮罩 + 桶形畸变](#后处理vr-遮罩--桶形畸变)
6. [UI Sprite 系统](#ui-sprite-系统)
7. [交互系统](#交互系统)
8. [动画系统](#动画系统)
9. [入场动画](#入场动画)
10. [参数调试](#参数调试)

---

## 整体架构

```
React (useEffect + useRef)
│
├── Three.js Scene
│   ├── SkyDome          ← 半径 100 的球体，程序化天空 + FBM 云朵
│   ├── FloorGrid        ← 100×100 网格，线框层 + 填充层，CPU 波浪驱动
│   └── UI Sprites       ← PlaneGeometry + MeshBasicMaterial，2D 贴图元素
│
├── EffectComposer
│   ├── RenderPass       ← 正常渲染场景
│   └── ShaderPass       ← 桶形畸变 + 超椭圆 VR 遮罩
│
└── TWEEN.Group (uiTw)   ← 所有缓动动画（入场、hover、点击）
```

**文件职责：**

| 文件 | 职责 |
|------|------|
| `Playground.tsx` | 场景组装、动画循环、事件绑定 |
| `src/uiSprite.ts` | UI Sprite 创建、预加载材质、设计稿坐标换算 |
| `src/setupGUI.ts` | dat.GUI 所有参数面板 |
| `src/waveTypes.ts` | 五种波浪函数定义 |
| `src/shaders/skyDome.{vert,frag}.glsl` | 天空球着色器 |
| `src/shaders/barrel.{vert,frag}.glsl` | 后处理着色器 |

---

## 天空球

**实现方式：** `SphereGeometry(100, 32, 16)` + `ShaderMaterial`，`side: THREE.BackSide` 使球体内表面可见，`depthTest/depthWrite: false` 确保天空永远在最远处不遮挡场景物体。

### 顶点着色器 `skyDome.vert.glsl`

```glsl
vWorldDir = normalize((modelMatrix * vec4(position, 0.0)).xyz);
```

将顶点位置变换到世界空间取方向向量，`w=0` 表示只做旋转/缩放，不做平移，得到从球心指向球面的方向。

### 片元着色器 `skyDome.frag.glsl`

**渐变天空：**

```glsl
float t = clamp(dir.y * 0.5 + 0.5, 0.0, 1.0);  // dir.y [-1,1] → t [0,1]
t = pow(t, uGradientPow);                         // 指数曲线调整过渡位置
float mask = smoothstep(uEdge0, uEdge1, t);
vec3 skyColor = mix(uBottomColor, uTopColor, mask);
```

**FBM 云朵：**

| 函数 | 作用 |
|------|------|
| `hash(vec2)` | 输入网格坐标，输出伪随机 [0,1] 标量 |
| `noise(vec2)` | 在整数网格上采样 hash，用 smoothstep 权重双线性插值（值噪声） |
| `fbm(vec2)` | 叠加 5 层频率 ×2.1、振幅 ×0.5 的噪声（分形布朗运动） |

云朵投影：

```glsl
vec2 uv = dir.xz / (dir.y + 0.1) * uCloudScale;  // 球面 → 平面透视投影
uv.x += uTime * uCloudSpeed;                       // 横向飘移
float n = fbm(uv) * 0.6 + 0.4 * fbm(uv * 2.0 + 3.7);  // 两层 FBM 叠加增加细节
float horizon = smoothstep(0.0, 0.25, dir.y);      // 地平线渐隐
cloudMask = smoothstep(1.0 - uCloudCoverage, 1.0 - uCloudCoverage + 0.3, n) * horizon;
```

### 可调参数

| uniform | 含义 | 默认值 |
|---------|------|--------|
| `uTopColor` / `uBottomColor` | 天顶/地平线颜色 | `#EBF7FF` / `#F2F1FF` |
| `uGradientPow` | 渐变曲线指数 | `1.8` |
| `uEdge0` / `uEdge1` | smoothstep 区间 | `0.25` / `0.6` |
| `uCloudCoverage` | 云量 | `0.45` |
| `uCloudDensity` | 云的不透明度 | `0.7` |
| `uCloudScale` | 云的空间尺寸 | `2.5` |
| `uCloudSpeed` | 云飘移速度 | `0.2` |

---

## 地面网格

网格为 **100×100** 分段、**400×400** 尺寸的平面，由两个独立的 Three.js 对象叠加渲染：

| 层 | 对象类型 | 材质 | 用途 |
|----|----------|------|------|
| 填充层 `gridFill` | `Mesh` | `MeshBasicMaterial` `#dde8f8` | 提供地面底色 |
| 线框层 `gridLines` | `LineSegments` | `LineBasicMaterial` `#88b0d8` | 绘制网格线 |

线框层的 `position.y` 比填充层高 `0.1`，避免 z-fighting（两个共面物体因深度精度互相穿插闪烁）。

### 顶点数据结构

```typescript
type Vert = {
  x: number      // 初始 X 坐标（固定不变）
  y: number      // 初始 Y 坐标（固定不变）
  z: number      // 当前 Z 坐标（每帧被波浪函数修改）
  initZ: number  // 弯曲基准 Z（sin 曲线初始形变）
  phase: number  // 随机初始相位（用于 random 波浪类型）
  amp: number    // 随机振幅系数 [5, 15]（使各顶点波动幅度不同）
}
```

### 弯曲基准形状

```typescript
const t = (row * COLS + col) / (COLS * ROWS)   // 顶点归一化索引 [0,1]
const initZ = Math.sin(t * Math.PI) * curve     // 正弦曲线，两端平、中间弯
```

`curve` 为负值时地面向下弯曲，形成类似"碗"或"跑道"的弧形地面。

### 动态 Buffer 更新

每帧在 CPU 侧修改 `verts[i].z`，然后回写到 `Float32Array` 并标记 `needsUpdate = true`：

```typescript
// 线框层：每条线段展开为 6 个 float（两端点各 xyz）
linesPosArr[offset + 0..5] = [a.x, a.y, a.z, b.x, b.y, b.z]
linesGeo.attributes.position.needsUpdate = true

// 填充层：每个顶点 3 个 float
fillPosArr[i * 3 + 0..2] = [verts[i].x, verts[i].y, verts[i].z]
fillGeo.attributes.position.needsUpdate = true
```

> 注意：线框层用 `segPairs` 索引对存储线段端点引用，每次全量展开写入；填充层共享顶点，用 `setIndex` 存储三角形索引，只需更新顶点位置数组。

---

## 波浪动画

波浪函数统一签名：`(t: number, v: WaveVert) => number`，返回值 ∈ [-1, 1]。

| 类型 | 函数 | 特征 |
|------|------|------|
| `traveling` | `sin(t*2 + x*0.15)` | 沿 X 轴传播的行波 |
| `interfere` | 两列不同频率行波叠加 | 驻波干涉图样 |
| `radial` | `sin(t*1.5 - sqrt(x²+y²)*0.1)` | 从原点向外扩散的水波纹 |
| `random` | `abs(sin(t + phase))` | 每顶点独立随机相位，整体抖动感 |
| `noise` | `noise3D(x*0.02, y*0.02, t*0.4)` | Simplex Noise，最自然的有机波动 |

### Wave Fade 渐入过渡

波浪不从整个地面开始，而是在 `waveFadeStart → waveFadeEnd` 区间内平滑过渡，避免波动区域边界的硬截断感：

```typescript
const raw = (v.x - waveFadeStart) / (waveFadeEnd - waveFadeStart)
const t01 = Math.max(0, Math.min(1, raw))          // clamp [0,1]
const waveFade = t01 * t01 * (3 - 2 * t01)         // smoothstep
v.z = v.initZ + waveFn(t, v) * v.amp * waveAmp * waveFade
```

`smoothstep` 公式 `t²(3-2t)` 使边界处一阶导数为 0（无折角），比线性过渡更自然。

---

## 后处理：VR 遮罩 + 桶形畸变

VR 遮罩和桶形畸变都是**全屏像素级操作**——遮罩要覆盖在整张画面上，畸变要对整张画面重新采样——两者都没法在普通 mesh 上实现。因此使用 `EffectComposer`：`RenderPass` 把场景渲染到离屏纹理，`ShaderPass` 把这张纹理作为 `tDiffuse` 输入，一次性完成畸变+遮罩后输出到屏幕。

### 超椭圆遮罩 SDF

模拟 VR 头显镜片的圆角矩形视野：

```glsl
vec2 d = abs(vUv - vec2(0.5, 0.5)) / vec2(maskRX, maskRY);
float dist = pow(pow(d.x, maskN) + pow(d.y, maskN), 1.0 / maskN);
float mask = smoothstep(1.0 - maskSoft, 1.0, dist);
```

- `maskN = 2`：标准椭圆
- `maskN > 2`：方圆形（介于椭圆和矩形之间），越大越方
- `maskSoft`：边缘羽化宽度，`0` 为硬边，`>0` 为柔和过渡

### 桶形畸变

模拟凸透镜光学效果（VR 镜片的典型畸变）：

```glsl
float scale = 1.0 + k * 0.5;           // 整体收缩，防止边角超出 [0,1]
vec2 d = (uv - barrelCenter) / scale;  // 向中心收缩
float dist = length(d);
return barrelCenter + d * (1.0 + k * dist);  // 越靠边缘拉伸越多
```

- `k > 0`：桶形畸变（中心膨胀，边缘压缩）
- `k < 0`：枕形畸变（中心压缩，边缘膨胀）
- `scale` 的作用是预先整体收缩 UV，使畸变后的采样点仍落在 `[0,1]` 范围内，避免边角出现拉伸伪影

### 遮罩与畸变的组合

```glsl
if (mask >= 1.0) {
  gl_FragColor = vec4(maskColor, 1.0);  // 完全遮罩区域：直接填充
  return;
}
vec2 uv = distort(vUv, barrel);         // 遮罩内区域：先畸变
vec4 color = texture2D(tDiffuse, uv);   // 再采样场景
gl_FragColor = vec4(mix(color.rgb, maskColor, mask), 1.0);  // 边界羽化
```

### 可调参数

| 参数 | 含义 | 默认值 |
|------|------|--------|
| `maskRX` / `maskRY` | 遮罩横/纵轴半径 | `0.5` |
| `maskN` | 超椭圆指数 | `5.5` |
| `maskSoft` | 边缘羽化宽度 | `0.6` |
| `barrel` | 畸变强度 | `0.3` |
| `barrelCenter` | 畸变中心 | `(0.5, 0.5)` |

---

## UI Sprite 系统

`src/uiSprite.ts` 提供了一套将设计稿像素坐标映射到 3D 世界坐标的 UI 系统。

### 坐标换算原理

设计稿基准宽度 `1920px`，将设计稿坐标换算为 Three.js 世界坐标：

```typescript
function designPxToWorld(dsX, dsY, z, designW = 1920) {
  const designScale = innerWidth / designW    // 响应式缩放比
  const ndcX = ((dsX * designScale) / innerWidth) * 2 - 1   // → NDC [-1, 1]
  const ndcY = -((dsY * designScale) / innerHeight) * 2 + 1
  // 从 NDC 反投影到 z 平面上的世界坐标
  const ndcPoint = new THREE.Vector3(ndcX, ndcY, 0.5)
  ndcPoint.unproject(camera)
  const rayDir = ndcPoint.sub(camera.position).normalize()
  const t = (z - camera.position.z) / rayDir.z
  return { worldX: camera.position.x + t * rayDir.x,
           worldY: camera.position.y + t * rayDir.y }
}
```

### 使用方式

```typescript
// 1. 预加载所有材质
const mats = await preloadMaterials(
  { banner: bannerUrl, star: starUrl },
  loader
)

// 2. 以设计稿像素坐标放置 Sprite
addUISprite({
  material: mats['banner'],
  itemW: 800,          // 设计稿宽度（px）
  left: 560,           // 设计稿左边距（px）
  top: 250,            // 设计稿顶部距离（px）
  z: 0,                // 世界空间 Z 轴深度
  onHover: (mesh) => { /* TWEEN 动画 */ },
  onHoverOut: (mesh) => { /* TWEEN 动画 */ },
  onClick: (mesh) => { /* 点击逻辑 */ }
})
```

`addUISprite` 内部：以 `(left, top)` 和 `(left+itemW, top)` 两点分别换算世界坐标，计算出宽度，再按图片宽高比计算高度，创建 `PlaneGeometry` + 传入的 `MeshBasicMaterial`。

---

## 交互系统

### Raycaster 检测

每次 `mousemove` 将鼠标坐标转为 NDC，用 Raycaster 对所有 `ClickableSprite` 做射线检测：

```typescript
pointerNDC.set((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1)
raycaster.setFromCamera(pointerNDC, camera)
const hovered = raycaster.intersectObjects(clickableSprites.map(s => s.mesh))
```

**状态追踪：** `hoveredSpriteMesh` 记录上一帧的 hover 对象，与本帧对比，实现精确的 `onHover`（进入）/ `onHoverOut`（离开）触发，避免每帧都触发回调。

### 鼠标视差

非锁定状态下，鼠标位置驱动镜头目标点偏移，形成视差跟随效果：

```typescript
const sx = x / innerWidth - 0.5   // [-0.5, 0.5]
const sy = y / innerHeight - 0.5
camTarget.set(sx * 8, sy * -4, camTarget.z)
```

相机通过 `camera.position.lerp(camTarget, 0.1)` 平滑跟随，`lerp` 系数 `0.1` 提供约 10 帧的惰性延迟感。

---

## 动画系统

所有动画统一使用 `TWEEN.Group`（`uiTw`），每帧在 `animate()` 中调用 `uiTw.update()`。

使用 Group 而非全局 TWEEN 的原因：场景销毁时可以精确清理该 Group 下所有 tween，避免内存泄漏。

**常用模式：**

```typescript
// 缩放动画
new TWEEN.Tween(mesh.scale, uiTw)
  .to({ x: 1.08, y: 1.08 }, 150)
  .easing(TWEEN.Easing.Quadratic.Out)
  .start()

// 属性动画（驱动 shader uniform）
new TWEEN.Tween({ t: 0 }, uiTw)
  .to({ t: 7 }, 1500)
  .onUpdate((v) => { barrelPass.uniforms.maskSoft.value = v.t })
  .start()
```

---

## 入场动画

页面加载后触发两段串联动画：

```
t=0ms                  t=1300ms        t=2100ms
  │                       │               │
  ├── 相机 rotation.x      │               │
  │   1.2 → 0（俯视→平视）──┤               │
  │   Quadratic.Out        │               │
  │                        ├── maskSoft    │
  │                        │   0.6 → 0 ───┤
  │                        │   （遮罩渐开）
  │                        │   Quadratic.InOut
```

点击"开始"按钮后的转场：

```
onClick:
  delay 400ms → banner opacity 1→0（300ms）  ← banner 淡出
  同时        → maskSoft 0→7（1500ms）        ← 遮罩吞噬画面，进入 VR 隧道感
```

---

## 参数调试

dat.GUI 面板（仅在 `dev/test/staging` 环境注入，通过 `vite-plugin-html` 条件注入 CDN script）：

| 面板 | 关键参数 |
|------|----------|
| **VR** | 遮罩形状、桶形畸变强度、畸变中心 |
| **Wave** | 波浪类型、速度、幅度、渐入区间 |
| **Buffer** | 地面弯曲度、Z/Y 位置 |
| **Camera** | X/Y 偏移、俯仰角、锁定归位 |
| **Sky** | 天空颜色、渐变曲线、云朵参数 |

修改 `planeCurve` 会触发 `removeFloorGrid` + `createFloorGrid` 重建，新结果通过 `onFloorRebuild` 回调同步回 Playground.tsx 的 `let` 变量和 `floorRef` 对象引用。
