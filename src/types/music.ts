export type ISpeed = 'slow' | 'medium' | 'fast'

export type ISegment = {
  start: number
  end: number
  speed: ISpeed
}

export type IMUSIC_CFG = {
  src: string
  patterns: {
    slow: {
      name: string
      times: number[]
      total: number
    }
    medium: {
      name: string
      times: number[]
      total: number
    }
    fast: {
      name: string
      times: number[]
      total: number
    }
  }
  easySegments: ISegment[]
  hardSegments: ISegment[]
}
