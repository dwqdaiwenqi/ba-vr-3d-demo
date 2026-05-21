import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { checkUser, authWithJwt, authWithWebView, startGame, gameOver, prepare } from '@/http/index'
import { getAuthTokenFromUrl, getWebviewDataFromUrl } from '@/helper/getWebviewDataFormUrl'
import type { IGameOver, IPrepare, IStartGame, IStartGameRes } from '@/types/http'

export enum GIFT_STATUS_ENUM {
  '今日没领取' = '今日没领取',
  '今日已领取' = '今日已领取',
  '全部领取' = '全部领取',
  '发奖失败' = '发奖失败'
}

export type IGlobalState = {
  userInfo: Partial<{
    userId: string
    nickname: string
    sdkId: string
  }>
  prepareInfo: Partial<IPrepare['results']>
  sessionKey: string
  encrypt: string

  showGameEndedPopup: boolean
  showLoginPoupup: boolean
  showRulePopup: boolean
  showGalRolePopup: boolean
  showGaIframePopup: boolean
  showSelectedRolePopup: boolean

  showPausePopup: boolean

  continueGame?: boolean
  resetGame?: boolean
  backHome?: boolean
  gameGiftResult: GIFT_STATUS_ENUM | null
  gameGiftGroupId: number
  gameGiftMessage: string;
  score: number
  showMsgPopup?: boolean
  msgPopupContent?: string
  backHomeSelectMember: boolean

  phase: 'loading' | 'ready' | 'playing' | 'ended'
  setPhase: (_phase: IGlobalState['phase']) => void
  setShowLoginPoupup: (_show: boolean) => void
  setShowRulePopup: (show: boolean) => void
  setShowGalRolePopup: (show: boolean) => void
  setShowGaIframePopup: (show: boolean) => void
  setShowSelectedRolePopup: (show: boolean) => void
  setShowPausePopup: (show: boolean) => void
  setShowGameEndedPopup: (show: boolean) => void
  setResetGame: (reset: boolean) => void
  setContinueGame: (resume: boolean) => void
  setBackHome: (back: boolean) => void
  setGameGiftResult: (ended: GIFT_STATUS_ENUM | null) => void
  setGameGiftGroupId: (id: number) => void
  setGameGiftMessage: (msg: string)=>void
  setScore: (score: number) => void

  checkUser: () => Promise<void>
  ensureAuth: () => Promise<void>
  prepare: () => Promise<void>
  startGame: (
    difficulty: 'easy' | 'hard',
    musicId: IStartGame['musicId'],
    isAutoPlay: boolean
  ) => Promise<IStartGameRes>
  gameOver: (score: number, combo: number) => Promise<void>
  setShowMsgPopup: (show: boolean, msg: string) => void
  setBackHomeSelectMember: (selectMember: boolean) => void
}

export const useGlobalStore = create(
  subscribeWithSelector<IGlobalState>((set, get) => ({
    userInfo: {},
    prepareInfo: {},
    sessionKey: '',
    encrypt: '',
    showGalRolePopup: false,
    continueGame: false,
    resetGame: false,
    showGameEndedPopup: false,
    showSelectedRolePopup: false,
    showRulePopup: false,
    showLoginPoupup: false,
    showGaIframePopup: false,

    showPausePopup: false,
    gameGiftResult: null,
    showMsgPopup: false,
    msgPopupContent: '',
    backHomeSelectMember: false,

    // showPausePopup: true,
    // gameGiftResult:  GIFT_STATUS_ENUM['今日没领取'],

    gameGiftGroupId: 1,
    gameGiftMessage:'',
    score: 999,

    backHome: false,
    phase: 'loading',


    setGameGiftMessage:(msg: string)=>{
      set({ gameGiftMessage: msg})
    },
    setBackHomeSelectMember: (selectMember: boolean) => {
      set({ backHomeSelectMember: selectMember })
    },
    setShowMsgPopup: (show, content = '') => {
      set({ showMsgPopup: show, msgPopupContent: content })
    },
    setScore: (score: number) => {
      set({ score })
    },

    setGameGiftGroupId: (id: number) => {
      set({ gameGiftGroupId: id })
    },
    setShowGalRolePopup: (show: boolean) => {
      set({ showGalRolePopup: show })
    },
    setGameGiftResult: (value: GIFT_STATUS_ENUM | null) => {
      set({ gameGiftResult: value })
    },
    setBackHome: (back: boolean) => {
      set({ backHome: back })
    },
    setContinueGame: (resume: boolean) => {
      set({ continueGame: resume })
    },
    setResetGame: (reset: boolean) => {
      set({ resetGame: reset })
    },

    setShowGameEndedPopup(show: boolean) {
      set({ showGameEndedPopup: show })
    },
    setShowPausePopup(show: boolean) {
      set({ showPausePopup: show })
    },
    setShowSelectedRolePopup(show: boolean) {
      set({ showSelectedRolePopup: show })
    },
    setShowGaIframePopup: (show: boolean) => {
      set({ showGaIframePopup: show })
    },

    setShowLoginPoupup: (show: boolean) => {
      set({ showLoginPoupup: show })
    },

    setShowRulePopup: (show: boolean) => {
      set({ showRulePopup: show })
    },

    setPhase: (phase: IGlobalState['phase']) => {
      set({ phase })
    },

    setUserInfo: (userInfo: IGlobalState['userInfo']) => {
      set({ userInfo })
    },
    checkUser: async () => {
      console.trace('33')
      try {
        await checkUser()
      } catch (err) {
        console.log(err)
      }
    },
    ensureAuth: async () => {
      // try {
      //   const res = await checkUser();
      //   set({ userInfo: { ...(res.results??{})} })
      //   console.log('获取到info',res.results);
      // } catch (err) {

      // }

      const webviewParam = getWebviewDataFromUrl()
      const authParam = getAuthTokenFromUrl()

      if (!webviewParam && !authParam) {
        // @ts-ignore
        throw new Error('无法获取用户信息，请重新登录')
      }

      try {
        if (webviewParam) {
          console.log('使用webview方式认证')
          set({ userInfo: {} })
          const authRes = await authWithWebView(webviewParam)
          set({ userInfo: { ...(authRes.results ?? {}) } })
          return
        }
        if (authParam) {
          console.log('使用jwt方式认证')
          set({ userInfo: {} })
          const authRes = await authWithJwt(authParam)
          set({ userInfo: { ...(authRes.results ?? {}) } })
          return
        }
      } catch (err) {
        // @ts-ignore
        throw new Error(`用户认证失败，请重新登录:${err?.message}`)
      }
    },

    prepare: async () => {
      try {
        const res = await prepare()
        set({ prepareInfo: res.results || {} })
      } catch (err) {
        console.log('prepare err', err)
      }
    },
    startGame: async (difficulty, musicId, isAutoPlay): Promise<IStartGameRes> => {
      const result = await startGame({
        difficulty,
        musicId,
        isAutoPlay
      })

      set({
        sessionKey: result.sessionKey,
        encrypt: result.encrypt
      })

      return result
    },
    gameOver: async (score, combo) => {
      const { sessionKey, encrypt } = get()

      const result = await gameOver(
        {
          score,
          combo
        },
        sessionKey,
        encrypt
      )

      const { rewardSent, claimStatus, currentDay, groupId, message } = result.results || {}

      // 发奖失败：rewardSent =false，没有claimStatus
      // 今日没领取：rewardSent=true，没有claimStatus
      // 今日已领取：rewardSent=false，claimStatus=CLAIMED_TODAY
      // 全部领取：rewardSend=false, claimStatus=ALL_CLAIMED

      let gameGiftResult: GIFT_STATUS_ENUM
      if (!rewardSent) {
        if (claimStatus === 'ALL_CLAIMED') {
          gameGiftResult = GIFT_STATUS_ENUM['全部领取']
        } else if (claimStatus === 'CLAIMED_TODAY') {
          gameGiftResult = GIFT_STATUS_ENUM['今日已领取']
        } else {
          gameGiftResult = GIFT_STATUS_ENUM['发奖失败']
        }
      } else {
        gameGiftResult = GIFT_STATUS_ENUM['今日没领取']
      }
      //       {
      // 	"sessionKey": "d63f16324827",
      // 	"activityId": "beat-heaven",
      // 	"userId": "10000566309",
      // 	"status": "ended",
      // 	"startTime": "2026-02-06T08:36:23.000Z",
      // 	"endTime": "2026-02-06T08:37:59.326Z",
      // 	"metadata": {
      // 		"webId": 1017,
      // 		"musicId": "music_000",
      // 		"difficulty": "easy",
      // 		"isAutoPlay": false
      // 	},
      // 	"result": {
      // 		"score": 0,
      // 		"combo": 0
      // 	},
      // 	"results": {
      // 		"music_000": {
      // 			"isAutoPlay": false,
      // 			"currentScore": 0,
      // 			"highestScore": 0,
      // 			"lowestScore": 0,
      // 			"isFirstTime": false
      // 		},
      // 		"rewardSent": false,
      // 		"message": "今日奖励已经领取过了！",
      // 		"claimStatus": "CLAIMED_TODAY",
      // 		"currentDay": 1,
      // 		"remainingRewards": 6,
      // 		"hasClaimedToday": true,
      // 		"isComplete": false
      // 	}
      // }

      let id: number
      if (!groupId && currentDay) {
        id = currentDay
      } else {
        id = groupId!
      }

      console.log('gameGiftGroupId', id, 'gameGiftResult', gameGiftResult)

      set({
        gameGiftGroupId: id,
        gameGiftResult: gameGiftResult,
        gameGiftMessage: message || ''
      })
    }
  }))
)
