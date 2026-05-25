export type WaveVert = {
  x: number
  y: number
  phase: number
}

export type WaveFn = (t: number, v: WaveVert) => number

export const waveFns: Record<string, WaveFn> = {
  // 行波：沿 x 轴方向传播的正弦波
  traveling: (t, v) => Math.sin(t * 2 + v.x * 0.15),

  // 干涉波：两列不同频率/方向的行波叠加
  interfere: (t, v) =>
    Math.sin(t * 2 + v.x * 0.1) * 0.6 + Math.sin(t * 1.3 + v.x * 0.05 + v.y * 0.08) * 0.4,

  // 径向波：从原点向外扩散的水波纹
  radial: (t, v) => Math.sin(t * 1.5 - Math.sqrt(v.x * v.x + v.y * v.y) * 0.1),

  // 随机相位波：每个顶点有独立随机相位，形成抖动感
  random: (t, v) => Math.abs(Math.sin(t + v.phase))
}

/**
 * 创建 simplex noise 波函数，noise3D 由外部传入避免模块间耦合
 */
export function createNoiseFn(noise3D: (x: number, y: number, z: number) => number): WaveFn {
  return (t, v) => noise3D(v.x * 0.02, v.y * 0.02, t * 0.4)
}
