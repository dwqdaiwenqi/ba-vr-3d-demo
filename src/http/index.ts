import encryptResult from '@/helper/encryptResult'
import axios from '@/http/request'
import type {
  ICheckUserResult,
  IClaimStatus,
  IPrepare,
  IStartGame,
  IStartGameRes,
  IGameOver
} from '@/types/http'

type IRes<T> = {}

export const checkUser = (): Promise<any> => {
  return axios.get<any, any>('/activities/beat-heaven/account/checkuser')
}

export function authWithWebView(data: string): Promise<ICheckUserResult> {
  return axios.post(`/activities/beat-heaven/account/checkuser`, {
    data
  })
}

export function authWithJwt(authToken: string): Promise<ICheckUserResult> {
  return axios.post(`/activities/beat-heaven/account/checkuser`, {
    auth: authToken
  })
}

// 结构示例见接口文档
export const prepare = (): Promise<IPrepare> => {
  return axios.get<any, any>('/activities/beat-heaven/sessions/prepare')
}

export const startGame = (metadata: IStartGame): Promise<IStartGameRes> => {
  return axios.post<
    {
      metadata: {
        webId: number
        difficulty: string
        musicId: string
        isAutoPlay: boolean
      }
    },
    any
  >('/activities/beat-heaven/sessions/start', {
    metadata: {
      webId: 1017,
      ...metadata
    }
  })
}

export async function gameOver(
  result: { score: number; combo: number },
  sessionKey: string,
  encryptStr: string
): Promise<IGameOver> {
  const encryptedPayload = encryptResult(result, encryptStr)

  const requestBody = {
    payload: encryptedPayload
  }

  return axios.post<any, any>(`/activities/beat-heaven/sessions/${sessionKey}/end`, requestBody)
}
