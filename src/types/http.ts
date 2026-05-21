export type ICheckUserResult = {
  cache: boolean
  results: {
    userId: string
    nickname: string
    sdkId?: string
  }
  token: string
}

export type IClaimStatus = 'NEVER_CLAIMED' | 'CLAIMED_TODAY' | 'CAN_CLAIM' | 'ALL_CLAIMED'

export type IPrepare = {
  results: {
    music_000: {
      unlock: boolean
      participants: {
        easy: number
        hard: number
      }
      highestScore: number
      lowestScore: number
      manualPlayCount: number
      autoPlayCount: number
      lastUpdated: string | null
      expect: number
    }
    music_001: {
      unlock: boolean
      participants: {
        easy: number
        hard: number
      }
      highestScore: number
      lowestScore: number
      manualPlayCount: number
      autoPlayCount: number
      lastUpdated: string | null
      expect: number
    }
    music_002: {
      unlock: boolean
      participants: {
        hard: number
      }
      highestScore: number
      lowestScore: number
      manualPlayCount: number
      autoPlayCount: number
      lastUpdated: string | null
      expect: number
    }
    scene_001: {
      unlock: boolean
      expect: number
    }
    scene_002: {
      unlock: boolean
      expect: number
    }
    scene_003: {
      unlock: boolean
      expect: number
    }
    scene_004: {
      unlock: boolean
      expect: number
    }
    scene_005: {
      unlock: boolean
      expect: number
    }
    scene_006: {
      unlock: boolean
      expect: number
    }
    scene_007: {
      unlock: boolean
      expect: number
    }
  }
}

export type IStartGame = {
  webId?: number
  difficulty: 'easy' | 'hard'
  musicId: 'music_000' | 'music_001' | 'music_002'
  isAutoPlay: boolean
}

export type IStartGameRes = {
  sessionKey: string
  encrypt: string
  results: {
    claimStatus: IClaimStatus
    isPureFirstTime: boolean
  }
}

export type IGameOver = {
  sessionKey: string
  activityId: string
  userId: string
  status: 'ended'
  startTime: string
  endTime: string
  metadata: {
    webId: number
    musicId: string
    difficulty: string
    isAutoPlay: boolean
  }
  result: {
    score: number
    combo: number
  }
  results: {
    rewardSent: boolean
    claimStatus?: IClaimStatus
    groupId?: number
    currentDay?: number
    webId: number
    message: string
    hasClaimedToday: boolean
  }
}
