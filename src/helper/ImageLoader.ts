export type ProgressCb = (loaded: number, total: number, key?: string) => void
export type ErrorCb = (err: unknown, path?: string) => void
export type CompleteCb<T> = (assets: Record<string, T>) => void

let assetsEmptyContainer: HTMLDivElement | null = null

export function ImageLoader<T = HTMLImageElement>(
  assetsModules: Record<string, () => Promise<any>>,
  loadFn: (url: string) => Promise<T>,
  concurrency = 6
) {
  const assetsPath = Object.keys(assetsModules)
  const totalAssets = assetsPath.length
  let loadedCount = 0
  let failedCount = 0

  let completeCallback: CompleteCb<T> = () => {}
  let errorCallback: ErrorCb = () => {}
  let progressFn: ProgressCb = () => {}

  if (!assetsEmptyContainer) {
    assetsEmptyContainer = document.createElement('div')
    assetsEmptyContainer.style.display = 'none'
    document.body.appendChild(assetsEmptyContainer)
  }

  const that = {
    Assets: {} as Record<string, T>,

    onProgress(fn: ProgressCb) {
      progressFn = fn

      const processQueue = async () => {
        while (true) {
          const path = assetsPath.shift()
          if (!path) break

          const name = path.match(/([^/\\]+)\.(jpg|png|gif|jpeg|webp)$/i)?.[1] || path

          try {
            const moduleLoader = assetsModules[path]
            if (!moduleLoader) throw new Error(`no module loader for ${path}`)

            const mod = await moduleLoader()
            const assetUrl: string = (mod && (mod.default || mod)) as string

            const asset = await loadFn(assetUrl)
            that.Assets[name] = asset

            loadedCount++
            const progress = Math.floor((loadedCount / totalAssets) * 100)
            try {
              progressFn(progress, totalAssets, name)
            } catch (e) {}

            if (loadedCount + failedCount >= totalAssets) {
              completeCallback(that.Assets)
            }
          } catch (err) {
            failedCount++
            try {
              errorCallback(err, path)
            } catch (e) {}
            if (loadedCount + failedCount >= totalAssets) {
              completeCallback(that.Assets)
            }
          }
        }
      }

      const workers = Array.from({ length: Math.max(1, concurrency) }, () => processQueue())
      // 发起执行（可选择等待 allSettled，如果需要）
      Promise.allSettled(workers).catch(() => {})

      return that
    },

    onComplete(fn: CompleteCb<T>) {
      completeCallback = fn
      return that
    },

    onError(fn: ErrorCb) {
      errorCallback = fn
      return that
    }
  }

  return that
}
