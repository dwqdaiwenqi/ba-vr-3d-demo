import { type AssetsManifest, Assets } from '@pixi/assets'

import { ImageLoader } from './ImageLoader'

import manifestJSON from '@/../public/pixi/manifest.json'

const ASSETS_BASE = import.meta.env.VITE_ASSETS_BASE_URL || ''
const PIXI_BASE = `${ASSETS_BASE}/pixi`

export const preloadInBackground = (modules: any) => {
  ImageLoader<HTMLImageElement>(modules, loadImageAsHTMLImage, 8).onProgress(() => {})
}

function loadImageAsHTMLImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    // console.log('url', url)
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = (e) => reject(new Error(String(e)))
    img.src = url
  })
}

const THREE_ASSETS_WEIGHT = 0.3
const IMAGES_WEIGHT = 0.7

const totalWeight = IMAGES_WEIGHT + THREE_ASSETS_WEIGHT
const imagesWeight = IMAGES_WEIGHT / totalWeight
const threeWeight = THREE_ASSETS_WEIGHT / totalWeight

let imagesProgress = 0 //
let threeProgress = 0 //
let lastDisplayed = 0 // 0 .. 1 防止回退

function dispatchCombined() {
  let combined = imagesProgress + threeProgress
  if (combined < lastDisplayed) combined = lastDisplayed
  lastDisplayed = combined
  window.dispatchEvent(
    new CustomEvent(window.EVENT_LOADING, {
      detail: { finished: combined, total: 1 }
    })
  )
}

export const preload = async () => {
  const webPromise = new Promise<void>((resolve) => {
    const modules = import.meta.glob([
      '@img/选择/**/*.webp',
      '@img/规则/**/*.webp',
      '@img/剧情展示/**/*.webp'
    ]) as any

    const loader = ImageLoader<HTMLImageElement>(modules, loadImageAsHTMLImage, 8)

    loader
      .onProgress((progress) => {
        imagesProgress = (progress / 100) * imagesWeight
        dispatchCombined()
      })
      .onError((err, path) => {
        console.warn('asset error', path, err)
      })
      .onComplete(() => {
        imagesProgress = imagesWeight
        dispatchCombined()
        resolve()
      })

    // imagesProgress = 1 * imagesWeight
    // dispatchCombined()
    // resolve()
  })

  const preloadGameAssets = async () => {
    await Assets.init({
      basePath: PIXI_BASE,
      manifest: manifestJSON as AssetsManifest
    })
    await Assets.loadBundle('default')
    await Assets.loadBundle('other')
    await Assets.loadBundle('cake-deco')
    await Assets.loadBundle('fx')
    await Assets.loadBundle('shun')
    await Assets.loadBundle('xinnai')
    await Assets.loadBundle('main')
    await Assets.loadBundle('playing')

    threeProgress = threeWeight
    dispatchCombined()
  }

  await Promise.all([webPromise, preloadGameAssets()])

  lastDisplayed = 1
  window.dispatchEvent(
    new CustomEvent(window.EVENT_LOADING, {
      detail: { finished: 1, total: 1 }
    })
  )
  window.dispatchEvent(new Event(window.EVENT_STARTED))
}
