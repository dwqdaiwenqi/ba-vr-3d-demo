// src/helper/SpineLoader.ts
export type SpineLoaderOptions = {
  baseUrl: string // e.g. "https://.../pixi/spine-xinnai/xinnai/"
  skeletonFile: string // e.g. "xinnai-RII7pQ.json"
  atlasFile?: string // e.g. "xinnai-TZVS2A.png.atlas"
  scale?: number // optional scale applied during SkeletonJson parsing
  timeout?: number // ms, default 10000
}

/**
 * 使用 spine.threejs.AssetManager 加载 spine 资源并返回 skeletonData（可直接用于创建 SkeletonMesh）。
 * - 依赖全局注入的 spine（window.spine）
 * - 使用 assetManager.isLoadingComplete() 做完成判定（比 setTimeout 更可靠）
 */
export async function SpineLoader(opts: SpineLoaderOptions): Promise<any> {
  const { baseUrl, skeletonFile, atlasFile, scale, timeout = 10000 } = opts
  const spineGlobal: any = (window as any).spine
  if (!spineGlobal || !spineGlobal.threejs) {
    throw new Error('spine.threejs is not available on window. Ensure spine-threejs is loaded.')
  }

  const AssetManager = spineGlobal.threejs.AssetManager
  const assetManager = new AssetManager(baseUrl)

  // 发起加载
  assetManager.loadText(skeletonFile)
  if (atlasFile) assetManager.loadTextureAtlas(atlasFile)

  // 等待完成（使用 requestAnimationFrame 轮询 isLoadingComplete）
  return await new Promise((resolve, reject) => {
    const start = Date.now()

    const tick = () => {
      try {
        // 某些 spine 版本没有 isLoadingComplete，但大多数有；优先使用。
        if (typeof assetManager.isLoadingComplete === 'function') {
          if (assetManager.isLoadingComplete()) {
            finalize()
            return
          }
        } else {
          // fallback: 当我们能通过 get() 取得 skeletonFile（与 atlasFile）时认为完成
          const jsonLoaded = !!assetManager.get(skeletonFile)
          const atlasLoaded = atlasFile ? !!assetManager.get(atlasFile) : true
          if (jsonLoaded && atlasLoaded) {
            finalize()
            return
          }
        }

        if (Date.now() - start > timeout) {
          reject(
            new Error(
              `SpineLoader timeout after ${timeout}ms for ${skeletonFile}${atlasFile ? ',' + atlasFile : ''}`
            )
          )
          return
        }
        requestAnimationFrame(tick)
      } catch (err) {
        reject(err)
      }
    }

    const finalize = () => {
      try {
        const atlas = atlasFile ? assetManager.get(atlasFile) : undefined
        const AtlasAttachmentLoader = spineGlobal.AtlasAttachmentLoader
        const SkeletonJson = spineGlobal.SkeletonJson

        const atlasLoader = atlas ? new AtlasAttachmentLoader(atlas) : undefined
        const skeletonJson = new SkeletonJson(atlasLoader)
        if (typeof scale === 'number') skeletonJson.scale = scale

        const rawJson = assetManager.get(skeletonFile)
        if (!rawJson) throw new Error('skeleton json is not available from assetManager.get')
        const skeletonData = skeletonJson.readSkeletonData(rawJson)

        resolve(skeletonData)
      } catch (e) {
        reject(e)
      }
    }

    requestAnimationFrame(tick)
  })
}
export default SpineLoader
