import type { ISpeed, ISegment, IMUSIC_CFG } from '@/types/music'

export const DESIGN_WIDTH = 1792

export const DESIGN_HEIGHT = 828

export const SESSION_KEY_SCENE_ID = 'ba_drum_minigame_scene_id'

export const LOCAL_STORAGE_TUTORIAL_SHOWN_KEY = 'ba_drum_tutorial'

export const SCORE_BY_SPEED: Record<ISpeed, number> = {
  slow: 50,
  medium: 100,
  fast: 200
}

// 扫描节点误差 秒
export const SCAN_WINDOW = 0.035

// 玩家判定节点误差 秒
export const JUDGE_WINDOW = 0.2

// 避免疯狂点击节流时间 毫秒
export const POINTER_DOWN_THROTTLE = 550

export enum MUSIC_ENUM {
  UNWELCOME_SCHOOL = 'Unwelcome School',
  FLIP_FLAP_FESTIVAL = 'Flip Flap Festival',
  PREPARE_DEPARTURE = '准备出发!'
}

export const MUSIC_CFG: Record<MUSIC_ENUM, IMUSIC_CFG> = {
  [MUSIC_ENUM.PREPARE_DEPARTURE]: {
    src: new URL('@audio/准备出发-琵琶.mp3', import.meta.url).href,
    patterns: {
      slow: {
        // 慢
        name: '慢',
        times: [0, 0.63, 1.26, 1.89, 2.52, 3.15, 3.78],
        total: 5.67
      },
      medium: {
        // 中
        name: '中',
        times: [0, 0.42, 0.84, 1.26, 1.68, 2.1, 2.52],
        total: 3.78
      },
      fast: {
        // 快
        name: '快',
        times: [0, 0.21, 0.42, 0.63, 0.84, 1.05, 1.26],
        total: 1.89
      }
    },
    easySegments: [
      { start: 0, end: 7, speed: 'slow' },
      { start: 7, end: 20, speed: 'medium' },
      { start: 20, end: 34, speed: 'fast' },
      { start: 34, end: 47, speed: 'slow' },
      { start: 47, end: 60, speed: 'fast' },
      { start: 60, end: 73, speed: 'slow' },
      { start: 73, end: 87, speed: 'fast' },
      { start: 87, end: 94, speed: 'slow' }
    ] as ISegment[],
    hardSegments: [
      { start: 0, end: 7, speed: 'medium' },
      { start: 7, end: 20, speed: 'fast' },
      { start: 20, end: 34, speed: 'fast' },
      { start: 34, end: 47, speed: 'medium' },
      { start: 47, end: 60, speed: 'fast' },
      { start: 60, end: 73, speed: 'medium' },
      { start: 73, end: 87, speed: 'fast' },
      { start: 87, end: 94, speed: 'slow' }
    ] as ISegment[]
  },

  [MUSIC_ENUM.UNWELCOME_SCHOOL]: {
    src: new URL('@audio/unwelcome school 伴奏.mp3', import.meta.url).href,
    patterns: {
      slow: {
        name: '慢',
        // 0	0.5	1	1.5	2	2.5	3
        times: [0, 0.5, 1, 1.5, 2, 2.5, 3],
        total: 4.5
      },
      medium: {
        name: '中',
        //  0	0.33	0.66	0.99	1.32	1.65	1.98
        times: [0, 0.33, 0.66, 0.99, 1.32, 1.65, 1.98],
        total: 2.97
      },
      fast: {
        name: '快',
        // 0	0.17	0.34	0.51	0.68	0.85	1.02
        times: [0, 0.17, 0.34, 0.51, 0.68, 0.85, 1.02],
        total: 1.53
      }
    },
    // 慢
    // 快
    // 中
    // 快
    // 中

    // 0~10S
    // 10~31S
    // 31~53S
    // 53~74S
    // 74~99S

    easySegments: [
      { start: 0, end: 10, speed: 'slow' },
      { start: 10, end: 31, speed: 'fast' },
      { start: 31, end: 53, speed: 'medium' },
      { start: 53, end: 74, speed: 'fast' },
      { start: 74, end: 99, speed: 'medium' }
    ] as ISegment[],
    // 中
    // 快
    // 中
    // 快
    // 快

    // 0~10S
    // 10~31S
    // 31~53S
    // 53~74S
    // 74~99S
    hardSegments: [
      { start: 0, end: 10, speed: 'medium' },
      { start: 10, end: 31, speed: 'fast' },
      { start: 31, end: 53, speed: 'medium' },
      { start: 53, end: 74, speed: 'fast' },
      { start: 74, end: 99, speed: 'fast' }
    ] as ISegment[]
  },
  [MUSIC_ENUM.FLIP_FLAP_FESTIVAL]: {
    src: new URL('@audio/flipflap short竹笛_笛子only.mp3', import.meta.url).href,
    patterns: {
      slow: {
        name: '慢',
        // 0	0.72	1.44	2.16	2.88	3.6	4.32
        times: [0, 0.72, 1.44, 2.16, 2.88, 3.6, 4.32],
        total: 6.48
      },
      medium: {
        name: '中',
        // 0	0.48	0.96	1.44	1.92	2.4	2.88
        times: [0, 0.48, 0.96, 1.44, 1.92, 2.4, 2.88],
        total: 4.32
      },
      fast: {
        name: '快',
        // 0	0.24	0.48	0.72	0.96	1.2	1.44
        times: [0, 0.24, 0.48, 0.72, 0.96, 1.2, 1.44],
        total: 2.16
      }
    },
    // 0~15S
    // 15~30S
    // 30~61S
    // 61~94S

    // 慢
    // 慢
    // 中
    // 中
    easySegments: [
      { start: 0, end: 15, speed: 'slow' },
      { start: 15, end: 30, speed: 'slow' },
      { start: 30, end: 61, speed: 'medium' },
      { start: 61, end: 94, speed: 'medium' }
    ] as ISegment[],

    // 0~15S
    // 15~30S
    // 30~61S
    // 61~94S

    // 慢
    // 中
    // 快
    // 快
    hardSegments: [
      { start: 0, end: 15, speed: 'slow' },
      { start: 15, end: 30, speed: 'medium' },
      { start: 30, end: 61, speed: 'fast' },
      { start: 61, end: 94, speed: 'fast' }
    ] as ISegment[]
  }
}
