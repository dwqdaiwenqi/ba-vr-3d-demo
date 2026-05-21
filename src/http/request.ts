import axios, { AxiosError } from 'axios'

const inst = axios.create({
  timeout: 1000 * 60
})

const BASE = '/axiom/api'
inst.defaults.baseURL = BASE

inst.interceptors.request.use((config) => {
  return config
})

inst.interceptors.response.use(
  (response) => {
    const data = response.data

    if (data && typeof data === 'object' && 'code' in data) {
      const bizError = data as { code: number; message?: string }

      // if (bizError.code === 403 || bizError.code === 100) {
      //   console.error('bizError', bizError, response.config.url)
      // } else {
      //   alert?.(bizError.message || `请求失败（code=${bizError.code}）`)
      // }
      console.error('bizError', bizError, response.config.url)

      return Promise.reject(bizError)
    }

    return data
  },
  (error: AxiosError) => {
    console.log('response err', error)
    const data = error.response?.data as any
    if (data && typeof data === 'object' && 'code' in data) {
      alert?.(data.message || `请求失败（code=${data.code}）`)
    } else {
      alert?.('网络错误，请稍后重试')
    }
    return Promise.reject(error)
  }
)

export default inst
